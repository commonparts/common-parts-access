import { createClient } from '@/lib/supabase/server'
import { firstEmbedded } from '@/lib/utils/supabase-embed'
import type { ArchiveLicenseInput } from '@/lib/storage/archive-license'
import type { Tables } from '@/types/supabase'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>
type ArchiveFile = Pick<Tables<'part_files'>, 'id' | 'original_filename' | 'filename' | 'upload_path'>

/**
 * Published part and attribution for a download. RLS: "Anyone can view published parts",
 * "Users can view all profiles" and "Licenses are publicly readable".
 * Uses the existing parts.slug index and license/profile primary keys.
 */
export async function getArchivePart(
  supabase: SupabaseServerClient,
  slug: string,
): Promise<(ArchiveLicenseInput & { id: string }) | null> {
  const { data, error } = await supabase.from('parts')
    .select('id, name, original_author, original_author_url, source_url, user_profiles(username, display_name), licenses!parts_license_id_fkey(name, spdx_id, url)')
    .eq('slug', slug).eq('status', 'published').maybeSingle()
  if (error) throw error
  if (!data) return null
  const profile = firstEmbedded(data.user_profiles)
  return {
    id: data.id,
    name: data.name,
    author: data.original_author || profile?.display_name || profile?.username || null,
    authorUrl: data.original_author ? data.original_author_url : null,
    sourceUrl: data.source_url,
    license: firstEmbedded(data.licenses),
  }
}

/**
 * Bounded model-file read; the caller requests one extra row to detect overflow.
 * RLS: "Users can view files of accessible parts". Filters on part_id/file_category
 * and orders by created_at, matching the archive's existing query.
 */
export async function getArchiveFiles(
  supabase: SupabaseServerClient,
  partId: string,
  limit: number,
): Promise<ArchiveFile[]> {
  const { data, error } = await supabase.from('part_files')
    .select('id, original_filename, filename, upload_path')
    .eq('part_id', partId).eq('file_category', 'model')
    .order('created_at', { ascending: true }).limit(limit)
  if (error) throw error
  return data ?? []
}
