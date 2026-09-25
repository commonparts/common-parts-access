/**
 * How well a part–product fit is established (issue #317). Mirrors the check
 * constraint on `part_products.evidence_level`; the rule deriving it from
 * print reports lives in SQL (`part_product_evidence_level`).
 */
export const EVIDENCE_LEVELS = ['declared', 'confirmed', 'disputed'] as const
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number]

/** What a link carries until print reports say otherwise — the column default. */
export const DEFAULT_EVIDENCE_LEVEL: EvidenceLevel = 'declared'

/**
 * Narrows a value read from the database to an EvidenceLevel. Anything
 * unexpected (a missing column in a stale select, a future level this build
 * does not know) falls back to `declared`: never claim more evidence than the
 * code can vouch for.
 */
export function toEvidenceLevel(value: unknown): EvidenceLevel {
  return EVIDENCE_LEVELS.includes(value as EvidenceLevel)
    ? (value as EvidenceLevel)
    : DEFAULT_EVIDENCE_LEVEL
}
