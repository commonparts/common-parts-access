import { STORAGE_BUCKETS } from '@/constants/app'

const URL_REGEX = /^https?:\/\//i
const CLEAN_SEGMENT_REGEX = /[\0-\x1F<>:"|?*\\]/g
const DUPLICATE_DOTS_REGEX = /\.\.+/g

/**
 * Storage bucket of each `part_files.file_category`. The bucket is not stored
 * on the row: `upload_path` is relative to the bucket of its category.
 */
const PART_FILE_CATEGORY_BUCKETS: Readonly<Record<string, string>> = {
  model: STORAGE_BUCKETS.MODEL_FILES,
  image: STORAGE_BUCKETS.MODEL_THUMBNAILS,
}

/**
 * Returns the storage bucket that holds a part file of the given category,
 * or null for a category no upload path writes.
 */
export function partFileBucket(category: string | null | undefined): string | null {
  if (!category) return null
  return Object.prototype.hasOwnProperty.call(PART_FILE_CATEGORY_BUCKETS, category)
    ? PART_FILE_CATEGORY_BUCKETS[category]
    : null
}

/**
 * Extracts the storage path (relative to a given bucket) from a stored
 * storage reference. Accepts a Supabase public object URL (query params such
 * as signed URL tokens are stripped) or a relative reference of the form
 * `bucket/path` (#56). Returns null when the reference does not point into
 * the given bucket.
 */
export function extractBucketStoragePath(
  reference: string | null | undefined,
  bucketName: string
): string | null {
  if (!reference) return null
  if (!URL_REGEX.test(reference)) {
    const prefix = `${bucketName}/`
    return reference.startsWith(prefix) ? reference.slice(prefix.length) || null : null
  }
  const marker = `/storage/v1/object/public/${bucketName}/`
  const idx = reference.indexOf(marker)
  if (idx === -1) return null
  return reference.slice(idx + marker.length).split('?')[0] || null
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
  partId?: string
}): string {
  const { storagePath, fallbackName, partId } = params
  const normalizedPath = storagePath.replace(/^\/+/, '')

  if (!normalizedPath) {
    return sanitizeSegment(fallbackName, 'file')
  }

  const segments = normalizedPath.split('/').filter(Boolean)

  let startIndex = 0
  if (segments.length > 0) {
    if (partId) {
      const modelMarkerIndex = segments.findIndex(
        (segment) => segment === partId || segment === `model-${partId}`
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
