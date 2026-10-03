/**
 * The two publication tracks and the question that routes between them
 * (issue #303).
 *
 * The tracks map one-to-one onto the two unchanged engines: `original` onto
 * `/api/upload/**` (`origin_type = 'original'`), `elsewhere` onto
 * `/api/curation/**` (`origin_type = 'curated'`). Unifying the entry point
 * does not merge them — the scoping that keeps each set of endpoints unable to
 * touch the other's drafts is what makes cross-track mutation impossible, and
 * it stays.
 */

export type PublishTrack = 'original' | 'elsewhere'

export interface PublishTrackDefinition {
  track: PublishTrack
  /** The answer as the contributor reads it. */
  answer: string
  /** What that answer commits them to. */
  detail: string
  /** Short label on a draft row. */
  badge: string
}

/**
 * The orientation question is the only conscious branching decision in the
 * flow, and it asks about a fact rather than a judgement.
 *
 * Authorship alone does not decide the track: a designer whose files live on
 * their own repository answers "already published elsewhere" and becomes a
 * curated row with themselves as the original author. Asking *where the part
 * comes from* makes that answerable by looking, instead of asking someone to
 * assess their own legal standing.
 */
export const PUBLISH_TRACKS: readonly PublishTrackDefinition[] = [
  {
    track: 'original',
    answer: 'I designed it',
    detail: "I'm publishing it here for the first time.",
    badge: 'Original',
  },
  {
    track: 'elsewhere',
    answer: "It's already published elsewhere",
    detail: 'Printables, Thingiverse, GitHub, or another platform — including my own.',
    badge: 'Published elsewhere',
  },
] as const

export function publishTrackDefinition(track: PublishTrack): PublishTrackDefinition {
  const definition = PUBLISH_TRACKS.find((t) => t.track === track)
  // The union has exactly two members, both present above.
  return definition ?? PUBLISH_TRACKS[0]
}
