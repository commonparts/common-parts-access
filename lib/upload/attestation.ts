/**
 * Originality attestation — the single blocking check of the public upload
 * flow (issue #293), defined once so the form and the publish gate can never
 * drift apart. It is the contributor-side counterpart of the curator's
 * blocking checklist (`lib/curation/checklist.ts`), but a different act by a
 * different person: here the uploader declares authorship of their own work.
 */

export interface AttestationClause {
  key: 'authorship' | 'rights' | 'hosting'
  text: string
}

/**
 * The three things a contributor confirms in one declaration. They are shown
 * as a single checkbox over an itemized list rather than three separate
 * checkboxes: this is one statement, and splitting it would invite
 * confirming two thirds of a legal claim.
 */
export const ATTESTATION_CLAUSES: readonly AttestationClause[] = [
  {
    key: 'authorship',
    text: 'I designed this part myself. It is not a copy, a re-upload, or a derivative of someone else’s model.',
  },
  {
    key: 'rights',
    text: 'I hold the rights to publish it, and I grant Common Parts Access the right to host and distribute the files under the license I selected.',
  },
  {
    key: 'hosting',
    text: 'The files are published here, not linked from another platform. Parts that live elsewhere are added through curation, not upload.',
  },
] as const

export const ATTESTATION_SUMMARY =
  'I created this part and hold the right to publish it here under the selected license.'

/** Human-readable blocker used by the publish gate when the declaration is absent. */
export const ATTESTATION_BLOCKER =
  'The originality declaration must be confirmed before publishing'
