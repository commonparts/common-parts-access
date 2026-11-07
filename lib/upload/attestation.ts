/**
 * Originality attestation — the single blocking check of the public upload
 * flow (issue #293), defined once so the form and the publish gate can never
 * drift apart. It is the contributor-side counterpart of the curator's
 * blocking checklist (`lib/curation/checklist.ts`), but a different act by a
 * different person: here the uploader declares authorship of their own work.
 *
 * The three things a contributor confirms in one declaration, whose texts are
 * the `Attestation.clauses` messages. They are shown as a single checkbox over
 * an itemized list rather than three separate checkboxes: this is one
 * statement, and splitting it would invite confirming two thirds of a legal
 * claim.
 */
export const ATTESTATION_CLAUSES = ['authorship', 'rights', 'hosting'] as const
