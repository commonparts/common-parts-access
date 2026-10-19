import type { CurationChecklist } from '@/types/database'
import { CURATION_BLOCKING_CRITERIA } from '@/lib/curation/checklist'
import { CRITERION_STEP } from '@/lib/publish/placement'
import { PUBLISH_STEPS, type PublishBlocker } from '@/lib/publish/steps'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'

/**
 * Local mirrors of the two publish gates (issue #302).
 *
 * Neither of these enforces anything: `POST /api/upload/drafts/[id]/publish`
 * and `POST /api/curation/drafts/[id]/publish` re-validate everything
 * server-side and remain the only authority. These functions exist so the tool
 * can say what is missing *before* the round trip, and — because each blocker
 * carries the step that owns it — so a resumed draft can open on the first
 * step that still has something to fix.
 *
 * They are pure and take plain values rather than component state, so the same
 * list can be derived from a freshly hydrated draft and from live form state
 * without the two disagreeing.
 */

export interface OriginalTrackState {
  title: string
  categoryId: string
  licenseId: string
  attested: boolean
  modelFileCount: number
  productCount: number
}

/** Mirrors the original track's gate, in its order. */
export function originalTrackBlockers(state: OriginalTrackState): PublishBlocker[] {
  const blockers: PublishBlocker[] = []

  if (state.title.trim().length < VALIDATION_LIMITS.PART.TITLE_MIN_LENGTH) {
    blockers.push({ step: PUBLISH_STEPS.ORIGIN, message: 'Give the part a title' })
  }
  if (!state.categoryId) {
    blockers.push({ step: PUBLISH_STEPS.ORIGIN, message: 'Choose a category' })
  }
  if (!state.licenseId) {
    blockers.push({ step: PUBLISH_STEPS.ORIGIN, message: 'Choose the license you publish under' })
  }
  if (!state.attested) {
    blockers.push({ step: PUBLISH_STEPS.ORIGIN, message: 'Confirm the originality declaration' })
  }
  if (state.modelFileCount < 1) {
    blockers.push({ step: PUBLISH_STEPS.FILES, message: 'Upload at least one model file' })
  }
  if (state.productCount < 1) {
    blockers.push({
      step: PUBLISH_STEPS.COMPATIBILITY,
      message: 'Link at least one compatible product',
    })
  }

  return blockers
}

export interface ElsewhereTrackState {
  checklist: CurationChecklist
  /**
   * True when the files stay at the source (`file_hosting_type = 'link_out'`).
   * A part published elsewhere is always referenced (#396); false only for a
   * draft saved as hosted before that rule, which cannot be published.
   */
  referenced: boolean
  sourcePlatform: string
  licenseId: string
  modelFileCount: number
  productCount: number
  needsLegalReview: boolean
}

/** Mirrors the elsewhere track's gate, in its order. */
export function elsewhereTrackBlockers(state: ElsewhereTrackState): PublishBlocker[] {
  const blockers: PublishBlocker[] = []

  // Each unmet criterion is reported on the step that renders it, so the jump
  // link lands on the evidence rather than on a checklist that no longer exists.
  for (const criterion of CURATION_BLOCKING_CRITERIA) {
    if (state.checklist[criterion.key] !== true) {
      blockers.push({
        step: CRITERION_STEP[criterion.key],
        message: `Confirm: ${criterion.label.toLowerCase()}`,
      })
    }
  }

  if (!state.referenced) {
    blockers.push({
      step: PUBLISH_STEPS.ORIGIN,
      message: 'Save this step again — a part published elsewhere is referenced at its source, never hosted',
    })
  }

  if (!state.licenseId) {
    blockers.push({ step: PUBLISH_STEPS.ORIGIN, message: 'Choose the license at the source' })
  }

  if (!state.sourcePlatform) {
    blockers.push({
      step: PUBLISH_STEPS.ORIGIN,
      message: 'Name the platform the part is published on',
    })
  }
  if (state.modelFileCount > 0) {
    blockers.push({
      step: PUBLISH_STEPS.FILES,
      message: 'Remove the uploaded model files — this part is referenced at its source',
    })
  }

  if (state.productCount < 1) {
    blockers.push({
      step: PUBLISH_STEPS.COMPATIBILITY,
      message: 'Link at least one compatible product',
    })
  }

  if (state.needsLegalReview) {
    blockers.push({
      step: PUBLISH_STEPS.REVIEW,
      message: 'This part is flagged for legal review and cannot be published until it is cleared',
    })
  }

  return blockers
}
