const MODEL_FILES_SEGMENT = '/model-files/'
const URL_REGEX = /^https?:\/\//i

/**
 * Attempts to extract a storage path relative to the model-files bucket.
 * Accepts absolute URLs, signed URLs, or already-relative paths.
 */
export function extractModelStoragePath(input?: string | null): string | null {
  if (!input) {
    return null
  }

  const value = input.trim()
  if (!value) {
    return null
  }

  if (value.includes(MODEL_FILES_SEGMENT)) {
    const match = value.match(/\/model-files\/(.+?)(\?|$)/)
    return match ? match[1] : null
  }

  if (URL_REGEX.test(value)) {
    return null
  }

  return value.replace(/^\/+/, '')
}

/**
 * Produces a filesystem and zip-friendly name while retaining readability.
 */
export function toZipSafeName(name: string, fallback: string): string {
  const normalized = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9\s-_]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  const candidate = normalized || fallback
  return candidate.slice(0, 80) || 'model-files'
}
