/**
 * Payload narrowing for the public upload flow (issue #293).
 *
 * `/upload` publishes exactly one kind of record: an original part, hosted
 * here, unverified. Origin, hosting mode, verification status and every
 * source-attribution field are therefore not the contributor's to set — they
 * belong to the curation flow, which has its own endpoints and its own gate.
 *
 * The upload endpoints reject a payload carrying any of these keys instead of
 * stripping them. Silently ignoring a field a caller deliberately sent hides
 * the real answer ("this flow cannot do that") behind a record that quietly
 * isn't what was asked for.
 */

/** Request-body keys the upload endpoints refuse outright. */
export const FORBIDDEN_UPLOAD_FIELDS = [
  'originType',
  'origin_type',
  'fileHostingType',
  'file_hosting_type',
  'verificationStatus',
  'verification_status',
  'sourceUrl',
  'source_url',
  'sourcePlatform',
  'source_platform',
  'originalAuthor',
  'original_author',
  'originalAuthorUrl',
  'original_author_url',
  'sourceLicenseId',
  'source_license_id',
] as const

/**
 * Returns the first forbidden key present in the payload, or null when the
 * payload stays inside what the public flow may set. Presence is what counts,
 * not the value: an explicit `fileHostingType: 'hosted'` is still a caller
 * trying to drive a control this flow does not expose.
 */
export function findForbiddenField(payload: Record<string, unknown>): string | null {
  return FORBIDDEN_UPLOAD_FIELDS.find((field) => field in payload) ?? null
}

/** Error message for a rejected payload, naming the offending field. */
export function forbiddenFieldError(field: string): string {
  return `"${field}" cannot be set through the upload flow — it publishes original parts hosted here. Parts from another platform go through curation.`
}
