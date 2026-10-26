import { isValidUuid } from '@/lib/utils/validation'

// Separator of the user ids listed in `CURATOR_USER_IDS`.
const CURATOR_IDS_SEPARATOR = ','

/**
 * Parses the comma-separated user ids of `CURATOR_USER_IDS`. Entries that are
 * not UUIDs are dropped, so a malformed value grants nothing instead of
 * failing open.
 */
export function parseCuratorIds(raw: string | undefined): ReadonlySet<string> {
  if (!raw) return new Set()
  return new Set(
    raw
      .split(CURATOR_IDS_SEPARATOR)
      .map((id) => id.trim().toLowerCase())
      .filter((id) => isValidUuid(id)),
  )
}

/**
 * Whether a user may read the curation data: zero-result searches and pending
 * product references (#435). Sign-up is open, so a session alone is not
 * enough to read free text typed by visitors. Curators are listed by id in the
 * server-only `CURATOR_USER_IDS` variable; unset or empty means nobody.
 */
export function isCurator(userId: string | null | undefined): boolean {
  if (!userId) return false
  return parseCuratorIds(process.env.CURATOR_USER_IDS).has(userId.toLowerCase())
}
