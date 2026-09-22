import { describe, expect, it } from 'vitest'
import { withPublishedParts } from './catalog'

describe('withPublishedParts', () => {
  it('drops rows whose parts_count is zero and keeps the rest in order', () => {
    const rows = [
      { slug: 'a', parts_count: 2 },
      { slug: 'b', parts_count: 0 },
      { slug: 'c', parts_count: 1 },
    ]
    expect(withPublishedParts(rows).map((row) => row.slug)).toEqual(['a', 'c'])
  })

  it('returns an empty array when nothing has parts', () => {
    expect(withPublishedParts([{ parts_count: 0 }])).toEqual([])
    expect(withPublishedParts([])).toEqual([])
  })
})
