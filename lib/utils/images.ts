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
