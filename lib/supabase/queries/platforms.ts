import { createClient } from '@/lib/supabase/server'
import type { SourcePlatform } from '@/types/database'

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
  const { data, error } = await supabase
    .from('source_platforms')
    .select('id, slug, name, base_url, logo_url, import_supported, active')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

export type SourcePlatformUrlCheck = { ok: true } | { ok: false; error: string }

/**
 * Verifies that a source URL's host matches the selected platform's base_url
 * host (www-insensitive) — required for link-out models, where the platform
 * claim must match where the files actually live. Platforms without a
 * base_url pass. Returns ok:false with an actionable message instead of
 * throwing so callers can map it to a 400.
 */
export async function validateSourceUrlMatchesPlatform(
  platformSlug: string,
  sourceUrl: string,
): Promise<SourcePlatformUrlCheck> {
  const platform = await getSourcePlatformBySlug(platformSlug)
  if (!platform) return { ok: false, error: 'Unknown source platform' }
  if (!platform.base_url) return { ok: true }

  try {
    const sourceHost = new URL(sourceUrl).hostname.replace(/^www\./, '')
    const platformHost = new URL(platform.base_url).hostname.replace(/^www\./, '')
    if (sourceHost !== platformHost) {
      return { ok: false, error: 'Source URL domain does not match the selected platform' }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Invalid source URL format' }
  }
}
