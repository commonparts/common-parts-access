import { describe, expect, it } from 'vitest'
import { distinctBrands, withPublishedParts } from './catalog'

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

describe('distinctBrands', () => {
  const bosch = { name: 'Bosch', slug: 'bosch' }
  const neff = { name: 'Neff', slug: 'neff' }
  const siemens = { name: 'Siemens', slug: 'siemens' }

  // The acceptance case of issue #315: one wheel, three manufacturers.
  it('keeps every brand of a part shared across brands, ordered by name', () => {
    expect(distinctBrands([siemens, neff, bosch])).toEqual([bosch, neff, siemens])
  })

  // The common case: a part fits several machines of the same manufacturer,
  // so the junction hands back the same brand once per product.
  it('collapses the same brand repeated across products', () => {
    expect(distinctBrands([bosch, bosch, bosch])).toEqual([bosch])
  })

  it('keeps the first row of a repeated slug', () => {
    const stale = { name: 'Bosch', slug: 'bosch', logo: 'a' }
    const later = { name: 'Bosch', slug: 'bosch', logo: 'b' }
    expect(distinctBrands([stale, later])).toEqual([stale])
  })

  // A product with no brand, or an embed that came back empty.
  it('drops nullish entries', () => {
    expect(distinctBrands([null, bosch, undefined])).toEqual([bosch])
  })

  it('returns an empty array for a part linked to nothing', () => {
    expect(distinctBrands([])).toEqual([])
  })
})
