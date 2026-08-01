import type { CurationCriterionKey } from '@/types/database'
import type { CurationFlagColumn } from '@/lib/curation/checklist'
import { PUBLISH_STEPS, type PublishStepIndex } from '@/lib/publish/steps'

/**
 * Where each judgement is rendered, now that the dedicated Checklist and Flags
 * steps are gone (issue #302).
 *
 * Nothing about the criteria themselves changes: the six blocking criteria
 * keep their definitions in `lib/curation/checklist.ts`, their storage in
 * `models.curation_checklist`, and their enforcement in the publish gate. Only
 * the location of the checkbox moves — next to the evidence it judges, so the
 * contributor is deciding with the field in front of them rather than
 * recalling it two steps later.
 *
 * These maps are also what the Review roll-up uses to build its jump links,
 * so a criterion can never be listed as unmet on a step that does not show it.
 */
export const CRITERION_STEP: Record<CurationCriterionKey, PublishStepIndex> = {
  // Judged against the source URL and its duplicate check.
  duplicate: PUBLISH_STEPS.ORIGIN,
  // Judged against the author, author URL and source license fields.
  attribution: PUBLISH_STEPS.ORIGIN,
  // Judged against the declared license and the resulting hosting outcome.
  license: PUBLISH_STEPS.ORIGIN,
  // Judged against the scope reminder shown with the part's identity.
  eligibility: PUBLISH_STEPS.ORIGIN,
  // Judged against the uploaded files, or the source link for a referenced part.
  file: PUBLISH_STEPS.FILES,
  // Judged against the linked products.
  product_target: PUBLISH_STEPS.COMPATIBILITY,
}

/**
 * Where each non-blocking completeness confirmation is rendered. Same move as
 * the criteria: each one sits next to its subject instead of in a panel.
 * `needs_verification` stays on Review — a print confirmation is a statement
 * about the whole part, not about any one field.
 */
export const FLAG_STEP: Record<CurationFlagColumn, PublishStepIndex> = {
  needs_category: PUBLISH_STEPS.ORIGIN,
  needs_photo: PUBLISH_STEPS.FILES,
  needs_print_settings: PUBLISH_STEPS.DETAILS,
  needs_instructions: PUBLISH_STEPS.DETAILS,
  needs_verification: PUBLISH_STEPS.REVIEW,
}
