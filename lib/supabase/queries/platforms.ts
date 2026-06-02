import { createClient } from '@/lib/supabase/server'
import type { SourcePlatform } from '@/types/models'

/**
 * Returns all active source platforms ordered by name.
 * Used to populate the platform selector in the upload form and for display in model details.
 */
export async function getActiveSourcePlatforms(): Promise<SourcePlatform[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('source_platforms')
    .select('id, slug, name, base_url, logo_url, import_supported, active')
    .eq('active', true)
    .order('name')
  if (error) throw error
  return data ?? []
}

/**
 * Returns a single source platform by slug, or null if not found.
 * Used by the model details API to resolve the display name and base URL.
 */
export async function getSourcePlatformBySlug(slug: string): Promise<SourcePlatform | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('source_platforms')
    .select('id, slug, name, base_url, logo_url, import_supported, active')
    .eq('slug', slug)
    .maybeSingle()
  return data ?? null
}
