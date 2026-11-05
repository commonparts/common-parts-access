const URL_REGEX = /^https?:\/\//i

/**
 * Resolves a storage reference to a full Supabase public URL.
 * Accepts both full URLs (returned as-is) and relative storage paths
 * like 'bucket-name/object-path' (converted to the full public URL).
 * Returns null unchanged so callers can safely pass nullable values.
 *
 * When NEXT_PUBLIC_SUPABASE_URL is missing:
 * - In development/test: throws immediately so the issue is caught early.
 * - In production: returns the original relative path as a fallback.
 */
export function resolveStorageUrl(pathOrUrl: string): string
export function resolveStorageUrl(pathOrUrl: string | null | undefined): string | null
export function resolveStorageUrl(pathOrUrl: string | null | undefined): string | null {
  if (pathOrUrl == null) return null
  if (URL_REGEX.test(pathOrUrl)) return pathOrUrl

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(
        'resolveStorageUrl requires NEXT_PUBLIC_SUPABASE_URL to resolve relative storage paths.'
      )
    }
    return pathOrUrl
  }

  return `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${pathOrUrl}`
}

/**
 * Resolves every string entry of a stored image list (for example
 * `parts.images`) to a full public URL. Non-string entries are dropped, and a
 * value that is not an array yields an empty list.
 */
export function resolveStorageUrls(pathsOrUrls: unknown): string[] {
  if (!Array.isArray(pathsOrUrls)) return []
  return pathsOrUrls
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => resolveStorageUrl(entry))
}

interface StoredPartMedia {
  thumbnail_url?: string | null
  images?: string[] | null
}

/**
 * Returns a copy of a part row with its thumbnail and gallery resolved to
 * public URLs, for API responses. The stored row keeps its storage
 * references: write paths merge new images into the stored values, never
 * into a resolved copy (#56).
 */
export function withResolvedPartMedia<T extends StoredPartMedia>(row: T): T {
  return {
    ...row,
    ...(row.thumbnail_url !== undefined && { thumbnail_url: resolveStorageUrl(row.thumbnail_url) }),
    ...(row.images != null && { images: resolveStorageUrls(row.images) }),
  }
}
