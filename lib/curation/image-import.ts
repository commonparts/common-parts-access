/**
 * When the curation tool triggers the source-image import
 * (POST /api/curation/drafts/[id]/import-images). Client-safe: no server-only
 * imports, so the publish UI can share it with the tests.
 */

/** Source platforms the import endpoint can read a gallery from. */
const IMAGE_IMPORT_PLATFORMS = new Set<string>(['printables'])

/** Whether the import can run for a draft from the given source platform. */
export function supportsImageImport(sourcePlatform: string | null | undefined): boolean {
  return Boolean(sourcePlatform) && IMAGE_IMPORT_PLATFORMS.has(sourcePlatform as string)
}

/**
 * Whether resuming a draft should trigger the import: its platform is
 * supported and it has no registered image yet. A draft with any image
 * (imported or uploaded) is left alone — the endpoint would skip it anyway.
 */
export function shouldImportOnResume(draft: {
  sourcePlatform: string | null | undefined
  imageFileCount: number
  imageCount: number
}): boolean {
  return supportsImageImport(draft.sourcePlatform) && draft.imageFileCount === 0 && draft.imageCount === 0
}
