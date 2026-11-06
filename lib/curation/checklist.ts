import type { CurationChecklist, CurationCriterionKey } from '@/types/database'

/**
 * Curation checklist v1 — the six blocking criteria (Flow P3 §4.3.3).
 * Shared by the curation UI (rendering) and the publish endpoint (gating),
 * so the definition can never drift between the two.
 */
export interface CurationCriterion {
  key: CurationCriterionKey
  label: string
  description: string
}

export const CURATION_BLOCKING_CRITERIA: readonly CurationCriterion[] = [
  {
    key: 'eligibility',
    label: 'Eligible part',
    description: 'Functional spare part for a real product — within registry scope, not decorative or generic.',
  },
  {
    key: 'product_target',
    label: 'Product target identified',
    description: 'The part targets an identifiable product; the product record is linked in this session.',
  },
  {
    key: 'license',
    label: 'License verified',
    description: 'SPDX license identified, among the licenses Common Parts lists. The part is referenced at its source, so NC and ND terms are accepted; a license that forbids sharing the model is not.',
  },
  {
    key: 'file',
    label: 'Valid file',
    description: 'STL, 3MF or STEP file present — uploaded here, or checked at the source for a referenced part — and opens correctly in a viewer or slicer.',
  },
  {
    key: 'attribution',
    label: 'Attribution complete',
    description: 'Original author, source URL and the license at the source captured on the record.',
  },
  {
    key: 'duplicate',
    label: 'No duplicate',
    description: 'The source and the part are not already in the registry (source URL checked).',
  },
] as const

/** True only when every blocking criterion is explicitly checked. */
export function isChecklistComplete(checklist: CurationChecklist | null | undefined): boolean {
  if (!checklist) return false
  return CURATION_BLOCKING_CRITERIA.every((criterion) => checklist[criterion.key] === true)
}

/** Blocking criteria not (yet) checked — used for messaging and rejection records. */
export function missingCriteria(checklist: CurationChecklist | null | undefined): CurationCriterionKey[] {
  return CURATION_BLOCKING_CRITERIA
    .filter((criterion) => !checklist || checklist[criterion.key] !== true)
    .map((criterion) => criterion.key)
}

/**
 * Non-blocking curation flags (Flow P3 §4.3.6). The UI presents each as a
 * positive confirmation; leaving it unchecked sets the needs_* column.
 * needs_legal_review is deliberately NOT in this list — it is a blocking flag
 * with its own justification requirement, handled separately.
 */
export type CurationFlagColumn =
  | 'needs_verification'
  | 'needs_print_settings'
  | 'needs_photo'
  | 'needs_instructions'
  | 'needs_category'

export interface CurationFlag {
  column: CurationFlagColumn
  label: string
  description: string
}

export const CURATION_FLAGS: readonly CurationFlag[] = [
  {
    column: 'needs_verification',
    label: 'Print verified',
    description: 'The part has been printed and fits — otherwise the record is flagged as needing verification.',
  },
  {
    column: 'needs_print_settings',
    label: 'Print settings provided',
    description: 'Material, orientation or slicer settings are documented.',
  },
  {
    column: 'needs_photo',
    label: 'Photo of the printed part',
    description: 'At least one photo of the physical print is included.',
  },
  {
    column: 'needs_instructions',
    label: 'Instructions provided',
    description: 'Installation or replacement instructions are present.',
  },
  {
    column: 'needs_category',
    label: 'Category confirmed',
    description: 'The category assignment is certain, not a best guess.',
  },
] as const
