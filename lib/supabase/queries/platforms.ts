import { createClient } from '@/lib/supabase/server'
import type { SourcePlatform } from '@/types/database'

const SOURCE_PLATFORM_SELECT = 'id, slug, name, base_url, logo_url, import_supported, active'

/** The source platform columns read by SOURCE_PLATFORM_SELECT. */
export type SourcePlatformSummary = Omit<SourcePlatform, 'created_at'>

/**
 * Returns all active source platforms ordered by name.
 * Used to populate the platform selector in the upload form and for display in part details.
 */
export async function getActiveSourcePlatforms(): Promise<SourcePlatformSummary[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('source_platforms')
    .select(SOURCE_PLATFORM_SELECT)
    .eq('active', true)
    .order('name')
  if (error) throw error
  return data ?? []
}

/**
 * Returns a single source platform by slug, or null if not found.
 * Used by the part details API to resolve the display name and base URL.
 */
export async function getSourcePlatformBySlug(slug: string): Promise<SourcePlatformSummary | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('source_platforms')
    .select(SOURCE_PLATFORM_SELECT)
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

export type SourcePlatformUrlCheck =
  | { ok: true }
  | { ok: false; error: string; status: 400 | 500 }

/**
 * Verifies that the platform exists and that the source URL's host matches
 * its base_url host (www-insensitive) — required for link-out parts, where
 * the platform claim must match where the files actually live. Platforms
 * without a base_url pass. Never throws: every failure comes back as
 * ok:false with the HTTP status it should map to (400 for client mistakes,
 * 500 when the platform lookup itself fails). Callers therefore need no
 * separate existence check on source_platforms.
 */
export async function validateSourceUrlMatchesPlatform(
  platformSlug: string,
  sourceUrl: string,
): Promise<SourcePlatformUrlCheck> {
  let platform: SourcePlatformSummary | null
  try {
    platform = await getSourcePlatformBySlug(platformSlug)
  } catch (error) {
    console.error('validateSourceUrlMatchesPlatform: platform lookup failed', error)
    return { ok: false, error: 'Failed to validate source platform', status: 500 }
  }

  if (!platform) return { ok: false, error: 'Unknown source platform', status: 400 }
  if (!platform.base_url) return { ok: true }

  try {
    const sourceHost = new URL(sourceUrl).hostname.replace(/^www\./, '')
    const platformHost = new URL(platform.base_url).hostname.replace(/^www\./, '')
    if (sourceHost !== platformHost) {
      return { ok: false, error: 'Source URL domain does not match the selected platform', status: 400 }
    }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Invalid source URL format', status: 400 }
  }
}
