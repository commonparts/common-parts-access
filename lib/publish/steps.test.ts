import { describe, expect, it } from 'vitest'
import { PUBLISH_STEPS, blockersForStep, firstBlockedStep, type PublishBlocker } from './steps'

const blocker = (step: PublishBlocker['step'], reason: PublishBlocker['reason'] = 'title'): PublishBlocker => ({
  step,
  reason,
})

describe('firstBlockedStep', () => {
  it('opens on Review when nothing is missing', () => {
    expect(firstBlockedStep([])).toBe(PUBLISH_STEPS.REVIEW)
  })

  it('opens on the only blocked step', () => {
    expect(firstBlockedStep([blocker(PUBLISH_STEPS.FILES)])).toBe(PUBLISH_STEPS.FILES)
  })

  // The list is built in gate order, not step order, so the earliest step can
  // appear anywhere in it.
  it('opens on the earliest blocked step regardless of list order', () => {
    const blockers = [
      blocker(PUBLISH_STEPS.COMPATIBILITY),
      blocker(PUBLISH_STEPS.ORIGIN),
      blocker(PUBLISH_STEPS.FILES),
    ]
    expect(firstBlockedStep(blockers)).toBe(PUBLISH_STEPS.ORIGIN)
  })

  it('opens on Review when only Review is blocked', () => {
    expect(firstBlockedStep([blocker(PUBLISH_STEPS.REVIEW)])).toBe(PUBLISH_STEPS.REVIEW)
  })
})

describe('blockersForStep', () => {
  it('returns only the blockers a step owns', () => {
    const blockers = [
      blocker(PUBLISH_STEPS.ORIGIN, 'title'),
      blocker(PUBLISH_STEPS.FILES, 'modelFile'),
      blocker(PUBLISH_STEPS.ORIGIN, 'category'),
    ]
    expect(blockersForStep(blockers, PUBLISH_STEPS.ORIGIN).map((b) => b.reason)).toEqual(['title', 'category'])
    expect(blockersForStep(blockers, PUBLISH_STEPS.DETAILS)).toEqual([])
  })
})
