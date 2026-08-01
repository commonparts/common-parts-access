/**
 * The step structure shared by both publish tracks (issue #302).
 *
 * Both tracks render the same five steps in the same order, so the labels and
 * the step indices are defined once here rather than in each tool. The two
 * engines behind them are unchanged — `/api/upload/**` and `/api/curation/**`
 * keep their own endpoints, gates and `origin_type` scoping. This module is
 * about where things are *rendered*, never about what is *enforced*.
 */

export const PUBLISH_STEP_LABELS = ['Origin', 'Files', 'Details', 'Compatibility', 'Review'] as const

export type PublishStepLabel = (typeof PUBLISH_STEP_LABELS)[number]

/** Step indices, named so call sites read as intent rather than magic numbers. */
export const PUBLISH_STEPS = {
  ORIGIN: 0,
  FILES: 1,
  DETAILS: 2,
  COMPATIBILITY: 3,
  REVIEW: 4,
} as const

export type PublishStepIndex = (typeof PUBLISH_STEPS)[keyof typeof PUBLISH_STEPS]

/**
 * One unmet publish condition, tagged with the step that owns the field it
 * refers to. Both tracks build this list from the same conditions their review
 * screens already mirror locally, so the resume rule and the pre-flight
 * message can never disagree about what is missing.
 */
export interface PublishBlocker {
  step: PublishStepIndex
  /** Shown to the contributor — must name the missing thing, not the column. */
  message: string
}

/**
 * The step a session should open at: the first one holding an unmet blocker,
 * or Review when nothing is missing.
 *
 * This replaces the two tools' hardcoded resume steps (Files for the original
 * track, the now-removed Checklist step for the elsewhere track). A draft that
 * is one field short of publishable should open on that field, not on whatever
 * step happened to be second.
 */
export function firstBlockedStep(blockers: readonly PublishBlocker[]): PublishStepIndex {
  if (blockers.length === 0) return PUBLISH_STEPS.REVIEW
  return blockers.reduce<PublishStepIndex>(
    (earliest, blocker) => (blocker.step < earliest ? blocker.step : earliest),
    PUBLISH_STEPS.REVIEW,
  )
}

/** The blockers owned by one step, for rendering a step-local warning. */
export function blockersForStep(
  blockers: readonly PublishBlocker[],
  step: PublishStepIndex,
): PublishBlocker[] {
  return blockers.filter((blocker) => blocker.step === step)
}
