import type { SupabaseClient } from '@supabase/supabase-js'

import type { AccountDeletionSteps, StorageFolder } from '@/lib/account/deletion'

/** Objects listed per Storage `list()` page (the API maximum is 1000). */
const STORAGE_LIST_PAGE_SIZE = 1000

/**
 * Supabase implementation of the account deletion steps. Must be given the
 * service-role client (`createAdminClient()`): the user's session cannot
 * delete an auth user, call `release_storage_ownership()` (service role
 * only), or read objects it no longer owns. Service role bypasses RLS, so
 * every query below filters on the user explicitly.
 */
export function createAccountDeletionSteps(admin: SupabaseClient): AccountDeletionSteps {
  return {
    async listUnpublishedPartIds(userId, limit) {
      // Covered by idx_parts_user.
      const { data, error } = await admin
        .from('parts')
        .select('id')
        .eq('user_id', userId)
        .neq('status', 'published')
        .limit(limit)
      if (error) throw error
      return (data ?? []).map((row: { id: string }) => row.id)
    },

    async listStorageObjects({ bucket, prefix }: StorageFolder) {
      const paths: string[] = []
      for (let offset = 0; ; offset += STORAGE_LIST_PAGE_SIZE) {
        const { data, error } = await admin.storage
          .from(bucket)
          .list(prefix, { limit: STORAGE_LIST_PAGE_SIZE, offset })
        if (error) throw error
        const entries = data ?? []
        // Folders come back as entries with a null id; only files are removed.
        for (const entry of entries) {
          if (entry.id) paths.push(`${prefix}/${entry.name}`)
        }
        if (entries.length < STORAGE_LIST_PAGE_SIZE) return paths
      }
    },

    async removeStorageObjects(bucket, paths) {
      const { error } = await admin.storage.from(bucket).remove(paths)
      if (error) throw error
    },

    async deleteParts(userId, partIds) {
      // part_files, part_products and the other part children cascade. The
      // owner filter repeats what the ids imply: service role bypasses RLS.
      const { error } = await admin
        .from('parts')
        .delete()
        .eq('user_id', userId)
        .neq('status', 'published')
        .in('id', partIds)
      if (error) throw error
    },

    async releaseStorageOwnership(userId) {
      const { data, error } = await admin.rpc('release_storage_ownership', { p_user_id: userId })
      if (error) throw error
      return typeof data === 'number' ? data : 0
    },

    async deleteAuthUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId)
      if (error) throw error
    },
  }
}
