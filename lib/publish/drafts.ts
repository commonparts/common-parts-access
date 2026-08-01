import type { PublishTrack } from '@/lib/publish/tracks'

/**
 * The merged drafts list behind `/publish` (issue #303).
 *
 * The two engines keep their own list endpoints — `GET /api/upload/drafts` and
 * `GET /api/curation/drafts` — because the `origin_type` scoping on each is
 * what keeps them unable to see each other's rows. The merge is therefore
 * client-side, over two responses, and this module is the pure part of it so
 * the ordering rule is testable without a fetch.
 */

/** A row of `GET /api/upload/drafts`. */
export interface UploadDraftRow {
  id: string
  name: string
  slug: string
  thumbnail_url?: string | null
  updated_at?: string | null
}

/** A row of `GET /api/curation/drafts`. */
export interface CurationDraftRow {
  id: string
  name: string
  slug: string
  source_url?: string | null
  updated_at?: string | null
}

export interface PublishDraft {
  id: string
  name: string
  slug: string
  /** Which engine owns the row — decides which track resumes it. */
  track: PublishTrack
  updatedAt: string | null
  thumbnailUrl: string | null
  /** Where the part is published, for a draft on the elsewhere track. */
  sourceUrl: string | null
}

/**
 * Merges both drafts lists into one, most recently touched first.
 *
 * A draft with no `updated_at` sorts last rather than first: an unknown
 * timestamp is not evidence of recent work, and putting it at the top would
 * push the draft the contributor actually just left further down.
 */
export function mergeDraftLists(
  originalDrafts: readonly UploadDraftRow[],
  elsewhereDrafts: readonly CurationDraftRow[],
): PublishDraft[] {
  const merged: PublishDraft[] = [
    ...originalDrafts.map((draft) => ({
      id: draft.id,
      name: draft.name,
      slug: draft.slug,
      track: 'original' as const,
      updatedAt: draft.updated_at ?? null,
      thumbnailUrl: draft.thumbnail_url ?? null,
      sourceUrl: null,
    })),
    ...elsewhereDrafts.map((draft) => ({
      id: draft.id,
      name: draft.name,
      slug: draft.slug,
      track: 'elsewhere' as const,
      updatedAt: draft.updated_at ?? null,
      thumbnailUrl: null,
      sourceUrl: draft.source_url ?? null,
    })),
  ]

  return merged.sort((a, b) => {
    if (a.updatedAt === b.updatedAt) return 0
    if (!a.updatedAt) return 1
    if (!b.updatedAt) return -1
    return a.updatedAt < b.updatedAt ? 1 : -1
  })
}
