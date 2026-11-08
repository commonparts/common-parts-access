/**
 * The two publication tracks and the question that routes between them
 * (issue #303).
 *
 * The tracks map one-to-one onto the two unchanged engines: `original` onto
 * `origin_type = 'original'`, `elsewhere` onto `origin_type = 'curated'`. Unifying the entry point
 * does not merge them — the scoping that keeps each set of queries unable to
 * touch the other's drafts is what makes cross-track mutation impossible, and
 * it stays.
 */

export type PublishTrack = 'original' | 'elsewhere'

/**
 * The orientation question is the only conscious branching decision in the
 * flow, and it asks about a fact rather than a judgement.
 *
 * Authorship alone does not decide the track: a designer whose files live on
 * their own repository answers "already published elsewhere" and becomes a
 * curated row with themselves as the original author. Asking *where the part
 * comes from* makes that answerable by looking, instead of asking someone to
 * assess their own legal standing.
 *
 * The order is the display order: referencing a part where it is already
 * published comes first, ahead of uploading a model here, and is marked
 * recommended. The answer, its detail and the badge of a draft row are the
 * `PublishTracks` messages, keyed by track.
 */
export const PUBLISH_TRACKS = ['elsewhere', 'original'] as const satisfies readonly PublishTrack[]

/** The track marked "Recommended" in the orientation question. */
export const RECOMMENDED_TRACK: PublishTrack = 'elsewhere'
