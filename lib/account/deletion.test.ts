import { describe, expect, it } from 'vitest'

import {
  AccountDeletionError,
  MAX_UNPUBLISHED_PART_BATCHES,
  STORAGE_REMOVE_LIMIT,
  UNPUBLISHED_PART_BATCH_SIZE,
  avatarStorageFolder,
  chunk,
  deleteAccount,
  partStorageFolders,
  type AccountDeletionSteps,
  type StorageBucket,
  type StorageFolder,
} from './deletion'

const USER = 'user-1'

interface FakeState {
  /** Unpublished part ids still in the database. */
  unpublished: string[]
  /** Objects per `bucket:prefix` folder. */
  objects: Map<string, string[]>
  /** Every call, in order, for asserting the sequence. */
  calls: string[]
}

const folderKey = (folder: StorageFolder) => `${folder.bucket}:${folder.prefix}`

/**
 * In-memory steps: deleting parts and removing objects mutate the state, so
 * the loop in deleteAccount sees the database shrink as it would for real.
 * `overrides` replaces individual steps to inject failures.
 */
function fakeSteps(
  state: FakeState,
  overrides: Partial<AccountDeletionSteps> = {},
): AccountDeletionSteps {
  return {
    async listUnpublishedPartIds(userId, limit) {
      state.calls.push(`list-parts:${userId}`)
      return state.unpublished.slice(0, limit)
    },
    async listStorageObjects(folder) {
      state.calls.push(`list:${folderKey(folder)}`)
      return [...(state.objects.get(folderKey(folder)) ?? [])]
    },
    async removeStorageObjects(bucket: StorageBucket, paths: string[]) {
      state.calls.push(`remove:${bucket}:${paths.length}`)
      for (const [key, existing] of state.objects) {
        if (key.startsWith(`${bucket}:`)) {
          state.objects.set(key, existing.filter((path) => !paths.includes(path)))
        }
      }
    },
    async deleteParts(userId, partIds) {
      state.calls.push(`delete-parts:${userId}:${partIds.length}`)
      state.unpublished = state.unpublished.filter((id) => !partIds.includes(id))
    },
    async releaseStorageOwnership(userId) {
      state.calls.push(`release:${userId}`)
      return 3
    },
    async deleteAuthUser(userId) {
      state.calls.push(`delete-user:${userId}`)
    },
    ...overrides,
  }
}

const emptyState = (): FakeState => ({ unpublished: [], objects: new Map(), calls: [] })

describe('partStorageFolders', () => {
  it('points at the files and thumbnails folders of the part', () => {
    expect(partStorageFolders(USER, 'part-9')).toEqual([
      { bucket: 'model-files', prefix: 'user-1/part-9/files' },
      { bucket: 'model-thumbnails', prefix: 'user-1/part-9/thumbnails' },
    ])
  })
})

describe('avatarStorageFolder', () => {
  it('points at the user folder of the avatar bucket', () => {
    expect(avatarStorageFolder(USER)).toEqual({ bucket: 'user-avatars', prefix: 'user-1' })
  })
})

describe('chunk', () => {
  it('splits into chunks of at most the given size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('returns no chunks for an empty list', () => {
    expect(chunk([], 3)).toEqual([])
  })

  it('rejects a size below 1', () => {
    expect(() => chunk([1], 0)).toThrow()
  })
})

describe('deleteAccount', () => {
  it('releases storage ownership and deletes the user when nothing else is owned', async () => {
    const state = emptyState()
    await deleteAccount(USER, fakeSteps(state))
    expect(state.calls).toEqual([
      'list-parts:user-1',
      'list:user-avatars:user-1',
      'release:user-1',
      'delete-user:user-1',
    ])
  })

  it('removes draft files before deleting the draft rows, then deletes the user', async () => {
    const state = emptyState()
    state.unpublished = ['d1']
    state.objects.set('model-files:user-1/d1/files', ['user-1/d1/files/a.stl'])
    state.objects.set('model-thumbnails:user-1/d1/thumbnails', ['user-1/d1/thumbnails/a.png'])

    await deleteAccount(USER, fakeSteps(state))

    expect(state.calls).toEqual([
      'list-parts:user-1',
      'list:model-files:user-1/d1/files',
      'remove:model-files:1',
      'list:model-thumbnails:user-1/d1/thumbnails',
      'remove:model-thumbnails:1',
      'delete-parts:user-1:1',
      'list:user-avatars:user-1',
      'release:user-1',
      'delete-user:user-1',
    ])
    expect(state.unpublished).toEqual([])
    expect([...state.objects.values()].flat()).toEqual([])
  })

  it('deletes the avatar', async () => {
    const state = emptyState()
    state.objects.set('user-avatars:user-1', ['user-1/avatar.png'])
    await deleteAccount(USER, fakeSteps(state))
    expect(state.calls).toContain('remove:user-avatars:1')
    expect(state.objects.get('user-avatars:user-1')).toEqual([])
  })

  it('skips the remove call for an empty folder', async () => {
    const state = emptyState()
    state.unpublished = ['d1']
    await deleteAccount(USER, fakeSteps(state))
    expect(state.calls.some((call) => call.startsWith('remove:'))).toBe(false)
    expect(state.calls).toContain('delete-parts:user-1:1')
  })

  it('works through unpublished parts in batches until none remain', async () => {
    const state = emptyState()
    const total = UNPUBLISHED_PART_BATCH_SIZE * 2 + 5
    state.unpublished = Array.from({ length: total }, (_, i) => `d${i}`)

    await deleteAccount(USER, fakeSteps(state))

    const deletes = state.calls.filter((call) => call.startsWith('delete-parts:'))
    expect(deletes).toEqual([
      `delete-parts:user-1:${UNPUBLISHED_PART_BATCH_SIZE}`,
      `delete-parts:user-1:${UNPUBLISHED_PART_BATCH_SIZE}`,
      'delete-parts:user-1:5',
    ])
    expect(state.unpublished).toEqual([])
  })

  it('re-checks after a full batch and stops when the next one is empty', async () => {
    const state = emptyState()
    state.unpublished = Array.from({ length: UNPUBLISHED_PART_BATCH_SIZE }, (_, i) => `d${i}`)
    await deleteAccount(USER, fakeSteps(state))
    expect(state.calls.filter((call) => call === 'list-parts:user-1')).toHaveLength(2)
  })

  it('splits a large folder into removals within the Storage limit', async () => {
    const state = emptyState()
    const paths = Array.from({ length: STORAGE_REMOVE_LIMIT + 1 }, (_, i) => `user-1/f${i}.png`)
    state.objects.set('user-avatars:user-1', paths)
    await deleteAccount(USER, fakeSteps(state))
    expect(state.calls.filter((call) => call.startsWith('remove:'))).toEqual([
      `remove:user-avatars:${STORAGE_REMOVE_LIMIT}`,
      'remove:user-avatars:1',
    ])
  })

  it('stops when a part delete removes nothing instead of looping forever', async () => {
    const state = emptyState()
    state.unpublished = Array.from({ length: UNPUBLISHED_PART_BATCH_SIZE }, (_, i) => `d${i}`)
    const steps = fakeSteps(state, { deleteParts: async () => {} })

    const failure = deleteAccount(USER, steps)
    await expect(failure).rejects.toBeInstanceOf(AccountDeletionError)
    await expect(failure).rejects.toMatchObject({ stage: 'unpublished_parts' })
    expect(state.calls.filter((call) => call === 'list-parts:user-1')).toHaveLength(
      MAX_UNPUBLISHED_PART_BATCHES,
    )
    expect(state.calls).not.toContain('delete-user:user-1')
  })

  it('keeps the draft rows when removing their files fails', async () => {
    const state = emptyState()
    state.unpublished = ['d1']
    state.objects.set('model-files:user-1/d1/files', ['user-1/d1/files/a.stl'])
    const steps = fakeSteps(state, {
      removeStorageObjects: async () => {
        throw new Error('storage down')
      },
    })

    await expect(deleteAccount(USER, steps)).rejects.toMatchObject({ stage: 'unpublished_parts' })
    expect(state.unpublished).toEqual(['d1'])
    expect(state.calls).not.toContain('delete-user:user-1')
  })

  it('does not delete the user when releasing storage ownership fails', async () => {
    const state = emptyState()
    const steps = fakeSteps(state, {
      releaseStorageOwnership: async () => {
        throw new Error('rpc failed')
      },
    })

    await expect(deleteAccount(USER, steps)).rejects.toMatchObject({ stage: 'storage_ownership' })
    expect(state.calls).not.toContain('delete-user:user-1')
  })

  it('reports the avatar stage when the avatar cannot be listed', async () => {
    const state = emptyState()
    const steps = fakeSteps(state, {
      listStorageObjects: async () => {
        throw new Error('list failed')
      },
    })

    await expect(deleteAccount(USER, steps)).rejects.toMatchObject({ stage: 'avatar' })
    expect(state.calls).not.toContain('release:user-1')
  })

  it('wraps an auth deletion failure with its stage and cause', async () => {
    const cause = new Error('auth refused')
    const steps = fakeSteps(emptyState(), {
      deleteAuthUser: async () => {
        throw cause
      },
    })

    await expect(deleteAccount(USER, steps)).rejects.toMatchObject({ stage: 'auth_user', cause })
  })

  it('can be retried after a failure and completes', async () => {
    const state = emptyState()
    state.unpublished = ['d1']
    let failOnce = true
    const steps = fakeSteps(state, {
      deleteAuthUser: async (userId) => {
        if (failOnce) {
          failOnce = false
          throw new Error('transient')
        }
        state.calls.push(`delete-user:${userId}`)
      },
    })

    await expect(deleteAccount(USER, steps)).rejects.toBeInstanceOf(AccountDeletionError)
    await deleteAccount(USER, steps)
    expect(state.calls).toContain('delete-user:user-1')
    expect(state.unpublished).toEqual([])
  })
})
