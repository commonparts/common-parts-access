import { FILE_TYPES } from '@/constants/app'
import { sanitizeFilename } from '@/lib/storage/image-processing'
import { parsePrintablesModelId, parseThingiverseThingId } from '@/lib/curation/prefill-parsing'
import { PRINTABLES_BASE_URL, PRINTABLES_MEDIA_BASE_URL, queryPrintables } from '@/lib/curation/printables-api'
import {
  getThingiverse,
  isThingiverseConfigured,
  THINGIVERSE_BASE_URL,
  THINGIVERSE_CDN_HOST,
} from '@/lib/curation/thingiverse-api'
import { normalizedHostname } from '@/lib/utils/validation'

/**
 * Listing and naming of a source's gallery images for the curation image
 * import (Flow P3 §4.3 step 2 — "images, listed files").
 */

const IMAGE_EXTENSIONS = new Set<string>(FILE_TYPES.IMAGE_FILES)

interface PrintablesImagesData {
  print?: { images?: Array<{ filePath?: string | null } | null> | null } | null
}

/**
 * Lists a print's gallery image URLs in page order (the API returns them in
 * the order the Printables page shows them). Empty array on any failure.
 */
export async function fetchPrintablesImageUrls(printId: string): Promise<string[]> {
  const data = await queryPrintables<PrintablesImagesData>(
    'query($id: ID!) { print(id: $id) { images { filePath } } }',
    { id: printId },
  )
  return (data?.print?.images ?? [])
    .map((image) => image?.filePath?.trim())
    .filter((path): path is string => Boolean(path))
    .map((path) => `${PRINTABLES_MEDIA_BASE_URL}/${path.replace(/^\//, '')}`)
}

interface ThingiverseImage {
  rank?: number | null
  sizes?: Array<{ type?: string | null; size?: string | null; url?: string | null } | null> | null
}

/**
 * Picks the original-upload URL of each image of a GET /things/{id}/images
 * response, in gallery order (`rank`). Verified against live responses
 * (#431): every `thumb` size points at the original file on
 * cdn.thingiverse.com, while the `display` and `preview` sizes are resizer
 * URLs with no file name in their path. Any other host is dropped, so the
 * import only downloads from the Thingiverse CDN.
 */
export function thingiverseImageUrls(images: unknown): string[] {
  if (!Array.isArray(images)) return []
  return (images as Array<ThingiverseImage | null>)
    .filter((image): image is ThingiverseImage => Boolean(image) && typeof image === 'object')
    .map((image, index) => ({ image, rank: typeof image.rank === 'number' ? image.rank : index }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ image }) => image.sizes?.find((s) => s?.type === 'thumb' && s?.size === 'large')?.url?.trim() ?? '')
    .filter((url) => {
      try {
        const parsed = new URL(url)
        return parsed.protocol === 'https:' && parsed.hostname === THINGIVERSE_CDN_HOST
      } catch {
        return false
      }
    })
}

/** Lists a Thing's gallery image URLs in page order. Empty array on any failure. */
export async function fetchThingiverseImageUrls(thingId: string): Promise<string[]> {
  return thingiverseImageUrls(await getThingiverse<unknown>(`/things/${thingId}/images`))
}

/** A platform whose gallery the import endpoint can read. */
interface SourceGallery {
  /** source_platforms.slug */
  platform: string
  /** www-insensitive host the source URL must have before its path is read. */
  host: string | null
  /** Whether the server is configured to read this platform. */
  isEnabled: () => boolean
  parseId: (url: URL) => string | null
  listImageUrls: (id: string) => Promise<string[]>
}

const SOURCE_GALLERIES: SourceGallery[] = [
  {
    platform: 'printables',
    host: normalizedHostname(PRINTABLES_BASE_URL),
    isEnabled: () => true,
    parseId: parsePrintablesModelId,
    listImageUrls: fetchPrintablesImageUrls,
  },
  {
    platform: 'thingiverse',
    host: normalizedHostname(THINGIVERSE_BASE_URL),
    isEnabled: isThingiverseConfigured,
    parseId: parseThingiverseThingId,
    listImageUrls: fetchThingiverseImageUrls,
  },
]

/**
 * Source platforms the image import can run for on this server, passed to
 * the publish UI so it never offers an import that cannot run. Thingiverse
 * is listed only when THINGIVERSE_APP_TOKEN is set (#431).
 */
export function enabledImageImportPlatforms(): string[] {
  return SOURCE_GALLERIES.filter((gallery) => gallery.isEnabled()).map((gallery) => gallery.platform)
}

/**
 * Resolves a draft's source URL to the listing of its gallery, or null when
 * no enabled platform can read it. The host is checked before the path is
 * read as an id — otherwise https://example.com/model/3161 would pull the
 * Printables images of model 3161.
 */
export function sourceGalleryLister(sourceUrl: string): (() => Promise<string[]>) | null {
  const host = normalizedHostname(sourceUrl)
  const gallery = SOURCE_GALLERIES.find((g) => g.host !== null && g.host === host && g.isEnabled())
  if (!gallery) return null
  let id: string | null
  try {
    id = gallery.parseId(new URL(sourceUrl))
  } catch {
    return null
  }
  if (!id) return null
  const galleryId = id
  return () => gallery.listImageUrls(galleryId)
}

/**
 * Builds the storage filename for the Nth imported image: "00-name.png",
 * "01-name.png", … The 00 image sorts first in the canonical filename order
 * (sortImageUrls), which makes it the thumbnail; the slideshow follows the
 * same order. Returns null when the source URL has no usable image extension.
 */
export function numberedImageFilename(index: number, sourceImageUrl: string): string | null {
  let rawName: string
  try {
    rawName = new URL(sourceImageUrl).pathname.split('/').pop() ?? ''
  } catch {
    return null
  }
  const dot = rawName.lastIndexOf('.')
  if (dot <= 0) return null
  const extension = rawName.slice(dot).toLowerCase()
  if (!IMAGE_EXTENSIONS.has(extension)) return null
  const base = sanitizeFilename(rawName.slice(0, dot), 'image')
  return `${String(index).padStart(2, '0')}-${base}${extension}`
}
