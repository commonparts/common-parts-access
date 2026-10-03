import { STORAGE_BUCKETS } from '@/constants/app'

/**
 * Account deletion (issue #178), as described in
 * docs/ACCOUNT_DELETION_POLICY.md: published parts stay without an owner,
 * likes, comments and curation rejections are anonymized, collections are
 * deleted. The database foreign keys do the anonymizing when the auth user is
 * deleted; this module does the work the database cannot do on its own.
 */

/** Parts fetched per round when deleting a user's unpublished parts. */
export const UNPUBLISHED_PART_BATCH_SIZE = 100

/**
 * Upper bound on rounds of unpublished-part deletion. Each round deletes the
 * rows it fetched, so the loop ends on its own; the cap only stops a delete
 * that silently removes nothing from looping forever.
 */
export const MAX_UNPUBLISHED_PART_BATCHES = 50

/** Storage API limit on objects removed in a single `remove()` call. */
export const STORAGE_REMOVE_LIMIT = 1000

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS]

/** A Storage folder: every object directly under `prefix` in `bucket`. */
export interface StorageFolder {
  bucket: StorageBucket
  prefix: string
}

/**
 * The side effects account deletion needs. Implemented against Supabase in
 * `lib/supabase/queries/account-deletion.ts`; injected so the ordering and
 * failure handling can be tested without a database.
 */
export interface AccountDeletionSteps {
  /** Ids of the user's parts that are not published (drafts, archived). */
  listUnpublishedPartIds(userId: string, limit: number): Promise<string[]>
  /** Full paths of the objects directly under a folder (sub-folders excluded). */
  listStorageObjects(folder: StorageFolder): Promise<string[]>
  removeStorageObjects(bucket: StorageBucket, paths: string[]): Promise<void>
  /** Deletes the given unpublished parts of the user; their child rows cascade. */
  deleteParts(userId: string, partIds: string[]): Promise<void>
  /** Clears the owner of the user's remaining Storage objects; returns the count. */
  releaseStorageOwnership(userId: string): Promise<number>
  /** Deletes the auth user; the database cascades and anonymizes the rest. */
  deleteAuthUser(userId: string): Promise<void>
}

export type AccountDeletionStage =
  | 'unpublished_parts'
  | 'avatar'
  | 'storage_ownership'
  | 'auth_user'

/** Wraps the failure of one stage so the route can log where deletion stopped. */
export class AccountDeletionError extends Error {
  constructor(
    public readonly stage: AccountDeletionStage,
    public readonly cause: unknown,
  ) {
    super(`Account deletion failed at stage "${stage}"`)
    this.name = 'AccountDeletionError'
  }
}

/**
 * Storage folders holding a part's uploads. Every upload path is
 * `<userId>/<partId>/files/<name>` in model-files or
 * `<userId>/<partId>/thumbnails/<name>` in model-thumbnails (see
 * `lib/storage/client-upload.ts` and the curation image import).
 */
export function partStorageFolders(userId: string, partId: string): StorageFolder[] {
  return [
    { bucket: STORAGE_BUCKETS.MODEL_FILES, prefix: `${userId}/${partId}/files` },
    { bucket: STORAGE_BUCKETS.MODEL_THUMBNAILS, prefix: `${userId}/${partId}/thumbnails` },
  ]
}

/** The user's avatar folder: avatar uploads must sit under `<userId>/`. */
export function avatarStorageFolder(userId: string): StorageFolder {
  return { bucket: STORAGE_BUCKETS.USER_AVATARS, prefix: userId }
}

/** Splits a list into consecutive chunks of at most `size` items. */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size < 1) throw new Error('chunk size must be at least 1')
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size))
  return chunks
}

/** Removes every object directly under each folder, bucket by bucket. */
async function removeFolders(steps: AccountDeletionSteps, folders: StorageFolder[]): Promise<void> {
  for (const folder of folders) {
    const paths = await steps.listStorageObjects(folder)
    for (const batch of chunk(paths, STORAGE_REMOVE_LIMIT)) {
      await steps.removeStorageObjects(folder.bucket, batch)
    }
  }
}

/** Runs one stage, tagging any failure with the stage name. */
async function runStage<T>(stage: AccountDeletionStage, run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (error) {
    throw new AccountDeletionError(stage, error)
  }
}

/**
 * Deletes a user's account in the order the database and Storage allow:
 *
 * 1. Unpublished parts (drafts, archived) are deleted with their files. Once
 *    the owner is gone nobody could see, finish or remove them. Files go
 *    first, rows second, so a failure in between leaves rows that a retry
 *    picks up again rather than rows whose files are already gone unnoticed.
 * 2. The avatar is deleted: it is profile data.
 * 3. Ownership of the remaining Storage objects (published part files) is
 *    released, because Supabase Auth refuses to delete a user who owns
 *    Storage objects.
 * 4. The auth user is deleted. `user_profiles` cascades from it and the
 *    foreign keys to `user_profiles` anonymize or delete the rest.
 *
 * Every stage is idempotent, so a failed deletion can simply be retried.
 * Throws `AccountDeletionError` naming the stage that failed.
 */
export async function deleteAccount(userId: string, steps: AccountDeletionSteps): Promise<void> {
  await runStage('unpublished_parts', async () => {
    for (let round = 0; ; round += 1) {
      if (round >= MAX_UNPUBLISHED_PART_BATCHES) {
        throw new Error(`Unpublished parts remain after ${MAX_UNPUBLISHED_PART_BATCHES} rounds`)
      }
      const partIds = await steps.listUnpublishedPartIds(userId, UNPUBLISHED_PART_BATCH_SIZE)
      if (partIds.length === 0) return
      await removeFolders(steps, partIds.flatMap((partId) => partStorageFolders(userId, partId)))
      await steps.deleteParts(userId, partIds)
      if (partIds.length < UNPUBLISHED_PART_BATCH_SIZE) return
    }
  })

  await runStage('avatar', () => removeFolders(steps, [avatarStorageFolder(userId)]))
  await runStage('storage_ownership', () => steps.releaseStorageOwnership(userId))
  await runStage('auth_user', () => steps.deleteAuthUser(userId))
}
