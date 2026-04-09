const URL_REGEX = /^https?:\/\//i

/**
 * Resolves a storage reference to a full Supabase public URL.
 * Accepts both full URLs (returned as-is) and relative storage paths
 * like 'bucket-name/object-path' (converted to the full public URL).
 * Returns null unchanged so callers can safely pass nullable values.
 */
export function resolveStorageUrl(pathOrUrl: string): string
export function resolveStorageUrl(pathOrUrl: string | null | undefined): string | null
export function resolveStorageUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null
  if (URL_REGEX.test(pathOrUrl)) return pathOrUrl
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  return `${supabaseUrl}/storage/v1/object/public/${pathOrUrl}`
}
