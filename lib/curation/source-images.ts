import { FILE_TYPES } from '@/constants/app'
import { sanitizeFilename } from '@/lib/storage/image-processing'
import { PRINTABLES_MEDIA_BASE_URL, queryPrintables } from '@/lib/curation/printables-api'

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
