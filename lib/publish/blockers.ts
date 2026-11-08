import type { CurationChecklist } from '@/types/database'
import { CURATION_BLOCKING_CRITERIA } from '@/lib/curation/checklist'
import { CRITERION_STEP } from '@/lib/publish/placement'
import { PUBLISH_STEPS, type PublishBlocker } from '@/lib/publish/steps'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'

/**
 * Local mirrors of the two publish gates (issue #302).
 *
 * Neither of these enforces anything: the `publishPublication` Server Action
 * re-validates everything
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
    blockers.push({ step: PUBLISH_STEPS.ORIGIN, reason: 'title' })
  }
  if (!state.categoryId) {
    blockers.push({ step: PUBLISH_STEPS.ORIGIN, reason: 'category' })
  }
  if (!state.licenseId) {
    blockers.push({ step: PUBLISH_STEPS.ORIGIN, reason: 'license' })
  }
  if (!state.attested) {
    blockers.push({ step: PUBLISH_STEPS.ORIGIN, reason: 'attestation' })
  }
  if (state.modelFileCount < 1) {
    blockers.push({ step: PUBLISH_STEPS.FILES, reason: 'modelFile' })
  }
  if (state.productCount < 1) {
    blockers.push({ step: PUBLISH_STEPS.COMPATIBILITY, reason: 'product' })
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
    if (state.checklist[criterion] !== true) {
      blockers.push({ step: CRITERION_STEP[criterion], reason: 'criterion', criterion })
    }
  }

  if (!state.referenced) {
    blockers.push({ step: PUBLISH_STEPS.ORIGIN, reason: 'hosted' })
  }

  if (!state.licenseId) {
    blockers.push({ step: PUBLISH_STEPS.ORIGIN, reason: 'sourceLicense' })
  }

  if (!state.sourcePlatform) {
    blockers.push({ step: PUBLISH_STEPS.ORIGIN, reason: 'sourcePlatform' })
  }
  if (state.modelFileCount > 0) {
    blockers.push({ step: PUBLISH_STEPS.FILES, reason: 'removeModelFiles' })
  }

  if (state.productCount < 1) {
    blockers.push({ step: PUBLISH_STEPS.COMPATIBILITY, reason: 'product' })
  }

  if (state.needsLegalReview) {
    blockers.push({ step: PUBLISH_STEPS.REVIEW, reason: 'legalReview' })
  }

  return blockers
}
