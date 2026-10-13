import type { PartFileHostingType } from '@/types/database'

/**
 * Hosting rule of the elsewhere track (#396): a part already published on
 * another platform is always referenced — its files stay at the original
 * publication and Common Parts links to them. Hosting files is reserved for
 * parts published here for the first time (the original track).
 *
 * The `file_hosting_type` column keeps both values; this module is the single
 * place the curation routes read the rule from.
 */
export const CURATED_FILE_HOSTING_TYPE = 'link_out' satisfies PartFileHostingType

export const CURATED_HOSTED_ERROR =
  "A part published elsewhere is always referenced: its files stay at the source. Set fileHostingType to 'link_out' or omit it."

export type CuratedHostingTypeResult =
  | { ok: true; value: typeof CURATED_FILE_HOSTING_TYPE }
  | { ok: false; error: string }

/**
 * Parses the optional `fileHostingType` of a curation request body.
 * Absent or empty defaults to `link_out`; `hosted` is refused with an
 * actionable message; any other value is invalid.
 */
export function parseCuratedHostingType(raw: unknown): CuratedHostingTypeResult {
  if (raw === undefined || raw === null) return { ok: true, value: CURATED_FILE_HOSTING_TYPE }
  if (typeof raw !== 'string') return { ok: false, error: 'Invalid file hosting type' }

  const value = raw.trim()
  if (value === '' || value === CURATED_FILE_HOSTING_TYPE) {
    return { ok: true, value: CURATED_FILE_HOSTING_TYPE }
  }
  if (value === 'hosted') return { ok: false, error: CURATED_HOSTED_ERROR }
  return { ok: false, error: 'Invalid file hosting type' }
}
