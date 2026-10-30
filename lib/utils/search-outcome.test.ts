import { describe, expect, it } from 'vitest'
import { classifySearch, splitUnservedResults } from './search-outcome'
import type { SearchBrandResult, SearchPartResult, SearchProductResult, SearchResults } from '@/types/search'

function product(id: string, fullMatch: boolean, partsCount: number): SearchProductResult {
  return {
    id,
    name: id,
    slug: id,
    image_url: null,
    category: null,
    parts_count: partsCount,
    reference: null,
    full_match: fullMatch,
  }
}

function part(id: string, fullMatch: boolean): SearchPartResult {
  return {
    id,
    name: id,
    slug: id,
    part_name: null,
    part_number: null,
    thumbnail_url: null,
    product_name: null,
    full_match: fullMatch,
  }
}

const brand: SearchBrandResult = { id: 'b', name: 'Brand', slug: 'brand', logo_url: null, product_count: 1 }

function results(overrides: Partial<SearchResults>): SearchResults {
  return { products: [], parts: [], brands: [], ...overrides }
}

describe('classifySearch', () => {
  it('is served by a full-match part', () => {
    const r = results({ parts: [part('p1', true)] })
    expect(classifySearch(r, [{ id: 'p1' }])).toBe('served')
  })

  it('is served by a full-match product with a published part', () => {
    const r = results({ products: [product('v10', true, 15)] })
    expect(classifySearch(r, [])).toBe('served')
  })

  it('returns no_results when nothing is rendered', () => {
    expect(classifySearch(results({}), [])).toBe('no_results')
  })

  it('returns approximate when only close matches come back ("mini cooper")', () => {
    const r = results({
      products: [product('instax-mini', false, 0), product('mac-mini', false, 0)],
      parts: [part('comb', false)],
    })
    expect(classifySearch(r, [{ id: 'comb' }])).toBe('approximate')
  })

  it('returns approximate when only a close match has parts', () => {
    const r = results({ products: [product('v10', false, 15)] })
    expect(classifySearch(r, [])).toBe('approximate')
  })

  it('returns approximate for brands alone', () => {
    expect(classifySearch(results({ brands: [brand] }), [])).toBe('approximate')
  })

  it('returns no_parts when a product without parts fully matches ("Mac mini M2")', () => {
    const r = results({
      products: [product('mac-mini-m2', true, 0), product('instax-mini', false, 0)],
      parts: [part('gear', false)],
    })
    expect(classifySearch(r, [{ id: 'gear' }])).toBe('no_parts')
  })

  it('ignores a full-match part whose card was not hydrated', () => {
    const r = results({ parts: [part('unpublished', true)] })
    expect(classifySearch(r, [])).toBe('no_results')
  })
})

describe('splitUnservedResults', () => {
  it('separates the fully matched products from the close matches', () => {
    const exact = product('mac-mini-m2', true, 0)
    const close = product('instax-mini', false, 0)
    const cards = [{ id: 'gear' }]
    const split = splitUnservedResults(results({ products: [exact, close], brands: [brand] }), cards)

    expect(split.matchingProducts).toEqual([exact])
    expect(split.closeMatches).toEqual({ products: [close], partCards: cards, brands: [brand] })
  })
})
