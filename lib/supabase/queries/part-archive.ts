import { createClient } from '@/lib/supabase/server'
import { firstEmbedded } from '@/lib/utils/supabase-embed'
import type { ArchiveLicenseInput } from '@/lib/storage/archive-license'
import type { Tables } from '@/types/supabase'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>
type ArchiveFile = Pick<Tables<'part_files'>, 'id' | 'original_filename' | 'filename' | 'upload_path'>

/**
 * Published part, attribution and bounded model files in one read. RLS: public reads
 * of published parts, accessible files, profiles and licenses. Uses parts.slug and
 * part_files.part_id indexes; file_category filters models, created_at orders them.
 * The caller requests one extra file to detect overflow; empty embeds keep the part.
 */
export async function getArchivePart(
  supabase: SupabaseServerClient,
  slug: string,
  fileLimit: number,
): Promise<(ArchiveLicenseInput & { id: string; files: ArchiveFile[] }) | null> {
  const { data, error } = await supabase.from('parts')
    .select(`id, name, original_author, original_author_url, source_url,
      user_profiles(username, display_name), licenses!parts_license_id_fkey(name, spdx_id, url),
      part_files(id, original_filename, filename, upload_path)`)
    .eq('slug', slug).eq('status', 'published').eq('part_files.file_category', 'model')
    .order('created_at', { referencedTable: 'part_files', ascending: true })
    .limit(fileLimit, { referencedTable: 'part_files' }).maybeSingle()
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
    files: data.part_files,
  }
}
