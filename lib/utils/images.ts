/**
 * Sorts an array of image URLs alphanumerically by filename, numeric-aware.
 * Defines the canonical display order for model images across all surfaces —
 * both at write time (API route) and at render time (legacy data fallback).
 */
export function sortImageUrls(urls: string[]): string[] {
  return [...urls].sort((a, b) => {
    const fa = a.split('/').pop() ?? a
    const fb = b.split('/').pop() ?? b
    return fa.localeCompare(fb, undefined, { numeric: true, sensitivity: 'base' })
  })
}

/**
 * Merges a model's current thumbnail and gallery with newly registered image
 * URLs (deduplicated) and returns the canonical display order. The first
 * entry becomes the thumbnail. Shared by every write path that registers
 * images so thumbnail selection can never diverge between them.
 */
export function mergeImageUrls(
  currentThumbnail: unknown,
  currentImages: unknown,
  newUrls: string[],
): string[] {
  const existingImages = Array.isArray(currentImages)
    ? currentImages.filter((img): img is string => typeof img === 'string')
    : []
  const existingThumbnail =
    typeof currentThumbnail === 'string' && currentThumbnail ? [currentThumbnail] : []
  return sortImageUrls([...new Set([...existingThumbnail, ...existingImages, ...newUrls])])
}
