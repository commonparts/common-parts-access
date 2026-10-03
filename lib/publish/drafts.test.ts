import { describe, expect, it } from 'vitest'
import { mergeDraftLists } from './drafts'

const original = (id: string, updatedAt: string | null) => ({
  id,
  name: `Original ${id}`,
  slug: `original-${id}`,
  thumbnail_url: `https://example.test/${id}.png`,
  updated_at: updatedAt,
})

const elsewhere = (id: string, updatedAt: string | null) => ({
  id,
  name: `Elsewhere ${id}`,
  slug: `elsewhere-${id}`,
  source_url: `https://www.printables.com/model/${id}`,
  updated_at: updatedAt,
})

describe('mergeDraftLists', () => {
  it('returns an empty list when neither track has drafts', () => {
    expect(mergeDraftLists([], [])).toEqual([])
  })

  it('tags each row with the track that owns it', () => {
    const merged = mergeDraftLists([original('a', '2026-08-01T10:00:00Z')], [elsewhere('b', '2026-08-01T09:00:00Z')])
    expect(merged.map((d) => d.track)).toEqual(['original', 'elsewhere'])
  })

  it('interleaves both tracks by most recently touched', () => {
    const merged = mergeDraftLists(
      [original('a', '2026-08-01T08:00:00Z'), original('c', '2026-08-01T12:00:00Z')],
      [elsewhere('b', '2026-08-01T10:00:00Z'), elsewhere('d', '2026-08-01T06:00:00Z')],
    )
    expect(merged.map((d) => d.id)).toEqual(['c', 'b', 'a', 'd'])
  })

  // An unknown timestamp is not evidence of recent work — sorting it first
  // would push the draft just left down the list.
  it('sorts drafts with no timestamp last', () => {
    const merged = mergeDraftLists(
      [original('a', null), original('b', '2026-08-01T10:00:00Z')],
      [elsewhere('c', null)],
    )
    expect(merged[0].id).toBe('b')
    expect(merged.slice(1).map((d) => d.id).sort()).toEqual(['a', 'c'])
  })

  it('carries the thumbnail for an original draft and the source for an elsewhere one', () => {
    const [first, second] = mergeDraftLists(
      [original('a', '2026-08-01T10:00:00Z')],
      [elsewhere('b', '2026-08-01T09:00:00Z')],
    )
    expect(first.thumbnailUrl).toBe('https://example.test/a.png')
    expect(first.sourceUrl).toBeNull()
    expect(second.sourceUrl).toBe('https://www.printables.com/model/b')
    expect(second.thumbnailUrl).toBeNull()
  })

  // Both list endpoints select an explicit column set, but the optional ones
  // arrive absent rather than null when the column is empty.
  it('normalises absent optional fields to null', () => {
    const [fromOriginal, fromElsewhere] = mergeDraftLists(
      [{ id: 'a', name: 'A', slug: 'a' }],
      [{ id: 'b', name: 'B', slug: 'b' }],
    )
    expect(fromOriginal).toMatchObject({ updatedAt: null, thumbnailUrl: null, sourceUrl: null })
    expect(fromElsewhere).toMatchObject({ updatedAt: null, thumbnailUrl: null, sourceUrl: null })
  })

  it('keeps every row from both lists', () => {
    const merged = mergeDraftLists(
      [original('a', '2026-08-01T10:00:00Z'), original('b', '2026-08-01T09:00:00Z')],
      [elsewhere('c', '2026-08-01T08:00:00Z')],
    )
    expect(merged).toHaveLength(3)
    expect(new Set(merged.map((d) => d.id))).toEqual(new Set(['a', 'b', 'c']))
  })
})
