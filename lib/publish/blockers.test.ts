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
  brandId: 'brand-uuid',
  productCount: 1,
}

const allCriteriaMet: CurationChecklist = Object.fromEntries(
  CURATION_BLOCKING_CRITERIA.map((c) => [c.key, true]),
)

/** A hosted part that satisfies every condition of the elsewhere gate. */
const publishableElsewhere: ElsewhereTrackState = {
  checklist: allCriteriaMet,
  referenced: false,
  sourcePlatform: 'printables',
  licenseId: 'license-uuid',
  publicationLicenseHostable: true,
  modelFileCount: 1,
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

  it('puts the brand and product pair on Compatibility', () => {
    const blockers = originalTrackBlockers({
      ...publishableOriginal,
      brandId: '',
      productCount: 0,
    })
    expect(blockers).toHaveLength(2)
    expect(blockers.every((b) => b.step === PUBLISH_STEPS.COMPATIBILITY)).toBe(true)
  })

  // The title has a minimum length, so a stray space is not a title.
  it('treats a whitespace-only title as missing', () => {
    const blockers = originalTrackBlockers({ ...publishableOriginal, title: '   ' })
    expect(blockers.map((b) => b.step)).toEqual([PUBLISH_STEPS.ORIGIN])
  })
})

describe('elsewhereTrackBlockers', () => {
  it('reports nothing for a publishable hosted part', () => {
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

  it('requires a model file when the files are hosted here', () => {
    const blockers = elsewhereTrackBlockers({ ...publishableElsewhere, modelFileCount: 0 })
    expect(blockers.map((b) => b.step)).toEqual([PUBLISH_STEPS.FILES])
  })

  it('forbids hosted files on a referenced part', () => {
    const blockers = elsewhereTrackBlockers({
      ...publishableElsewhere,
      referenced: true,
      publicationLicenseHostable: false,
      modelFileCount: 2,
    })
    expect(blockers.map((b) => b.step)).toEqual([PUBLISH_STEPS.FILES])
  })

  // A referenced part links to its source, so the platform claim is what makes
  // that link checkable against the URL's domain.
  it('requires a platform for a referenced part, on Origin', () => {
    const blockers = elsewhereTrackBlockers({
      ...publishableElsewhere,
      referenced: true,
      sourcePlatform: '',
      modelFileCount: 0,
    })
    expect(blockers.map((b) => b.step)).toEqual([PUBLISH_STEPS.ORIGIN])
  })

  it('does not require a platform when the files are hosted here', () => {
    expect(
      elsewhereTrackBlockers({ ...publishableElsewhere, sourcePlatform: '' }),
    ).toEqual([])
  })

  it('blocks an NC/ND publication license on a hosted part', () => {
    const blockers = elsewhereTrackBlockers({
      ...publishableElsewhere,
      publicationLicenseHostable: false,
    })
    expect(blockers.map((b) => b.step)).toEqual([PUBLISH_STEPS.DETAILS])
  })

  it('allows an NC/ND publication license on a referenced part', () => {
    expect(
      elsewhereTrackBlockers({
        ...publishableElsewhere,
        referenced: true,
        publicationLicenseHostable: false,
        modelFileCount: 0,
      }),
    ).toEqual([])
  })

  // The license list loads asynchronously. An unknown hostability must not
  // manufacture a blocker the server would not raise.
  it('does not block while the license is still unknown', () => {
    expect(
      elsewhereTrackBlockers({ ...publishableElsewhere, publicationLicenseHostable: null }),
    ).toEqual([])
  })

  it('blocks on a missing publication license, on Details', () => {
    const blockers = elsewhereTrackBlockers({
      ...publishableElsewhere,
      licenseId: '',
      publicationLicenseHostable: null,
    })
    expect(blockers.map((b) => b.step)).toEqual([PUBLISH_STEPS.DETAILS])
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
