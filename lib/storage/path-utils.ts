const MODEL_FILES_SEGMENT = '/model-files/'
const URL_REGEX = /^https?:\/\//i
const CLEAN_SEGMENT_REGEX = /[\0-\x1F<>:"|?*\\]/g
const DUPLICATE_DOTS_REGEX = /\.\.+/g

/**
 * Extracts the storage path (relative to a given bucket) from a Supabase
 * public object URL. Strips query params (e.g. signed URL tokens).
 * Returns null when the URL does not contain the expected bucket segment.
 */
export function extractBucketStoragePath(
  url: string | null | undefined,
  bucketName: string
): string | null {
  if (!url) return null
  const marker = `/storage/v1/object/public/${bucketName}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return url.slice(idx + marker.length).split('?')[0] || null
}

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

function sanitizeSegment(segment: string, fallback: string) {
  const cleaned = segment
    .replace(/\//g, '')
    .replace(CLEAN_SEGMENT_REGEX, '')
    .replace(DUPLICATE_DOTS_REGEX, '.')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned || fallback
}

/**
 * Preserves the nested structure stored in upload_path by removing the dynamic
 * user/model prefixes and sanitizing the remaining segments for safe zip entry paths.
 */
export function buildZipEntryPath(params: {
  storagePath: string
  fallbackName: string
  modelId?: string
}): string {
  const { storagePath, fallbackName, modelId } = params
  const normalizedPath = storagePath.replace(/^\/+/, '')

  if (!normalizedPath) {
    return sanitizeSegment(fallbackName, 'file')
  }

  const segments = normalizedPath.split('/').filter(Boolean)

  let startIndex = 0
  if (segments.length > 0) {
    if (modelId) {
      const modelMarkerIndex = segments.findIndex(
        (segment) => segment === modelId || segment === `model-${modelId}`
      )
      if (modelMarkerIndex !== -1) {
        startIndex = modelMarkerIndex + 1
      }
    }

    if (startIndex === 0 && segments.length >= 2) {
      startIndex = 2
    }
  }

  const relativeSegments = segments.slice(startIndex)

  if (relativeSegments.length === 0) {
    relativeSegments.push(fallbackName)
  }

  const sanitizedSegments = relativeSegments
    .map((segment, index) => sanitizeSegment(segment, index === relativeSegments.length - 1 ? fallbackName : 'folder'))
    .filter(Boolean)

  const path = sanitizedSegments.join('/').replace(/\/+/g, '/')
  return path || sanitizeSegment(fallbackName, 'file')
}
