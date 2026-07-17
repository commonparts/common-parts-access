import type { CurationChecklist, CurationCriterionKey, Model } from '@/types/database'

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
    label: 'License on whitelist',
    description: 'SPDX license allowing hosting and reuse — no NC or ND restrictions.',
  },
  {
    key: 'file',
    label: 'Valid file',
    description: 'STL, 3MF or STEP file present, opens correctly in a viewer or slicer.',
  },
  {
    key: 'attribution',
    label: 'Attribution complete',
    description: 'Original author, source URL and source license captured on the record.',
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
 * Coerces an untrusted value into a clean CurationChecklist: only known
 * criterion keys, only boolean values. Returns null when the input is not an
 * object, so callers can 400 instead of silently storing garbage.
 */
export function sanitizeChecklist(value: unknown): CurationChecklist | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  const result: CurationChecklist = {}
  for (const criterion of CURATION_BLOCKING_CRITERIA) {
    const raw = input[criterion.key]
    if (typeof raw === 'boolean') result[criterion.key] = raw
  }
  return result
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

/** The needs_* flag subset of a model row, as stored in the database. */
export type CurationFlagState = Pick<Model, CurationFlagColumn>
