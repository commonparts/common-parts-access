/**
 * When the curation tool triggers the source-image import
 * (POST /api/curation/drafts/[id]/import-images). Client-safe: no server-only
 * imports, so the publish UI can share it with the tests.
 *
 * The platforms the import can run for depend on the server configuration
 * (Thingiverse needs THINGIVERSE_APP_TOKEN, #431), so the server computes
 * them (`enabledImageImportPlatforms`) and the UI passes them in.
 */

/** Whether the import can run for a draft from the given source platform. */
export function supportsImageImport(
  sourcePlatform: string | null | undefined,
  enabledPlatforms: readonly string[],
): boolean {
  return Boolean(sourcePlatform) && enabledPlatforms.includes(sourcePlatform as string)
}

/**
 * Whether resuming a draft should trigger the import: its platform is
 * supported and it has no registered image yet. A draft with any image
 * (imported or uploaded) is left alone — the endpoint would skip it anyway.
 */
export function shouldImportOnResume(
  draft: {
    sourcePlatform: string | null | undefined
    imageFileCount: number
    imageCount: number
  },
  enabledPlatforms: readonly string[],
): boolean {
  return (
    supportsImageImport(draft.sourcePlatform, enabledPlatforms) &&
    draft.imageFileCount === 0 &&
    draft.imageCount === 0
  )
}
