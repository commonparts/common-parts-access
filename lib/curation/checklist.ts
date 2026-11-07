import type { CurationChecklist, CurationCriterionKey } from '@/types/database'

/**
 * Curation checklist v1 — the six blocking criteria (Flow P3 §4.3.3).
 * Shared by the curation UI (rendering) and the publish endpoint (gating),
 * so the definition can never drift between the two. Their labels and
 * descriptions are the `CurationCriteria` messages, keyed by criterion.
 */
export const CURATION_BLOCKING_CRITERIA = [
  'eligibility',
  'product_target',
  'license',
  'file',
  'attribution',
  'duplicate',
] as const satisfies readonly CurationCriterionKey[]

/** True only when every blocking criterion is explicitly checked. */
export function isChecklistComplete(checklist: CurationChecklist | null | undefined): boolean {
  if (!checklist) return false
  return CURATION_BLOCKING_CRITERIA.every((criterion) => checklist[criterion] === true)
}

/** Blocking criteria not (yet) checked — used for messaging and rejection records. */
export function missingCriteria(checklist: CurationChecklist | null | undefined): CurationCriterionKey[] {
  return CURATION_BLOCKING_CRITERIA.filter((criterion) => !checklist || checklist[criterion] !== true)
}

/**
 * Non-blocking curation flags (Flow P3 §4.3.6). The UI presents each as a
 * positive confirmation; leaving it unchecked sets the needs_* column. Their
 * labels and descriptions are the `CurationFlags` messages, keyed by column.
 * needs_legal_review is deliberately NOT in this list — it is a blocking flag
 * with its own justification requirement, handled separately.
 */
export const CURATION_FLAGS = [
  'needs_verification',
  'needs_print_settings',
  'needs_photo',
  'needs_instructions',
  'needs_category',
] as const

export type CurationFlagColumn = (typeof CURATION_FLAGS)[number]
