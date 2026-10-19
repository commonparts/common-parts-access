import { describe, expect, it } from 'vitest'
import {
  elsewhereTrackBlockers,
  originalTrackBlockers,
  type ElsewhereTrackState,
  type OriginalTrackState,
} from './blockers'
import { CURATION_BLOCKING_CRITERIA } from '@/lib/curation/checklist'
import { CRITERION_STEP } from './placement'
import { PUBLISH_STEPS } from './steps'
import type { CurationChecklist } from '@/types/database'

/** A part that satisfies every condition of the original track's gate. */
const publishableOriginal: OriginalTrackState = {
  title: 'Dishwasher rack wheel clip',
  categoryId: 'category-uuid',
  licenseId: 'license-uuid',
  attested: true,
  modelFileCount: 1,
  productCount: 1,
}

const allCriteriaMet: CurationChecklist = Object.fromEntries(
  CURATION_BLOCKING_CRITERIA.map((c) => [c.key, true]),
)

/** A referenced part that satisfies every condition of the elsewhere gate. */
const publishableElsewhere: ElsewhereTrackState = {
  checklist: allCriteriaMet,
  referenced: true,
  sourcePlatform: 'printables',
  licenseId: 'license-uuid',
  modelFileCount: 0,
  productCount: 1,
  needsLegalReview: false,
}

describe('originalTrackBlockers', () => {
  it('reports nothing for a publishable part', () => {
    expect(originalTrackBlockers(publishableOriginal)).toEqual([])
  })

  it('puts identity, license and the declaration on Origin', () => {
    const blockers = originalTrackBlockers({
      ...publishableOriginal,
      title: '',
      categoryId: '',
      licenseId: '',
      attested: false,
    })
    expect(blockers).toHaveLength(4)
    expect(blockers.every((b) => b.step === PUBLISH_STEPS.ORIGIN)).toBe(true)
  })

  it('puts a missing model file on Files', () => {
    const blockers = originalTrackBlockers({ ...publishableOriginal, modelFileCount: 0 })
    expect(blockers).toHaveLength(1)
    expect(blockers[0].step).toBe(PUBLISH_STEPS.FILES)
  })

  // The brand is no longer part of the gate (issue #315): it is derived from
  // the linked products, so the product link is the only compatibility
  // condition left.
  it('puts a missing product link on Compatibility', () => {
    const blockers = originalTrackBlockers({ ...publishableOriginal, productCount: 0 })
    expect(blockers).toHaveLength(1)
    expect(blockers[0].step).toBe(PUBLISH_STEPS.COMPATIBILITY)
  })

  // The title has a minimum length, so a stray space is not a title.
  it('treats a whitespace-only title as missing', () => {
    const blockers = originalTrackBlockers({ ...publishableOriginal, title: '   ' })
    expect(blockers.map((b) => b.step)).toEqual([PUBLISH_STEPS.ORIGIN])
  })
})

describe('elsewhereTrackBlockers', () => {
  it('reports nothing for a publishable referenced part', () => {
    expect(elsewhereTrackBlockers(publishableElsewhere)).toEqual([])
  })

  it('reports every unconfirmed criterion on the step that renders it', () => {
    const blockers = elsewhereTrackBlockers({ ...publishableElsewhere, checklist: {} })
    expect(blockers).toHaveLength(CURATION_BLOCKING_CRITERIA.length)
    for (const criterion of CURATION_BLOCKING_CRITERIA) {
      const match = blockers.find((b) => b.message.includes(criterion.label.toLowerCase()))
      expect(match?.step).toBe(CRITERION_STEP[criterion.key])
    }
  })

  // A part published elsewhere is always referenced (#396). A draft saved as
  // hosted before that rule is sent back to Origin, whose save references it.
  it('blocks a hosted draft, on Origin', () => {
    const blockers = elsewhereTrackBlockers({ ...publishableElsewhere, referenced: false })
    expect(blockers.map((b) => b.step)).toEqual([PUBLISH_STEPS.ORIGIN])
  })

  it('forbids hosted model files, on Files', () => {
    const blockers = elsewhereTrackBlockers({ ...publishableElsewhere, modelFileCount: 2 })
    expect(blockers.map((b) => b.step)).toEqual([PUBLISH_STEPS.FILES])
  })

  // A referenced part links to its source, so the platform claim is what makes
  // that link checkable against the URL's domain.
  it('requires a platform, on Origin', () => {
    const blockers = elsewhereTrackBlockers({ ...publishableElsewhere, sourcePlatform: '' })
    expect(blockers.map((b) => b.step)).toEqual([PUBLISH_STEPS.ORIGIN])
  })

  // The license is the one chosen at the source, captured with the
  // attribution (#374).
  it('blocks on a missing license at the source, on Origin', () => {
    const blockers = elsewhereTrackBlockers({ ...publishableElsewhere, licenseId: '' })
    expect(blockers.map((b) => b.step)).toEqual([PUBLISH_STEPS.ORIGIN])
  })

  it('blocks a part flagged for legal review, on Review', () => {
    const blockers = elsewhereTrackBlockers({ ...publishableElsewhere, needsLegalReview: true })
    expect(blockers.map((b) => b.step)).toEqual([PUBLISH_STEPS.REVIEW])
  })

  it('blocks on no linked product, on Compatibility', () => {
    const blockers = elsewhereTrackBlockers({ ...publishableElsewhere, productCount: 0 })
    expect(blockers.map((b) => b.step)).toEqual([PUBLISH_STEPS.COMPATIBILITY])
  })
})
