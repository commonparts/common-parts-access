import { describe, expect, it } from 'vitest'
import {
  COLLAPSED_COMPATIBLE_PRODUCTS_COUNT,
  filterCompatibleProducts,
  groupProductsByBrand,
  isActiveFilterQuery,
  limitProductGroups,
  resolveCompatibleProductsView,
} from './compatible-products'

const philips = { name: 'Philips', slug: 'philips' }
const braun = { name: 'Braun', slug: 'braun' }

const products = [
  { name: 'Series 10', slug: 'series-10', brand: braun, references: [{ value: '5040' }] },
  { name: 'OneBlade Pro', slug: 'oneblade-pro', brand: philips, references: [{ value: 'QP6520/30' }] },
  { name: 'Series 9', slug: 'series-9', brand: braun, references: [] },
  { name: 'Unbranded trimmer', slug: 'unbranded-trimmer', brand: null },
  { name: 'OneBlade', slug: 'oneblade', brand: philips, references: [{ value: 'QP2520' }] },
]

describe('groupProductsByBrand', () => {
  it('orders groups by brand name and products by name, numbers included', () => {
    const groups = groupProductsByBrand(products)
    expect(groups.map((g) => g.brand?.name ?? null)).toEqual(['Braun', 'Philips', null])
    expect(groups[0].products.map((p) => p.name)).toEqual(['Series 9', 'Series 10'])
    expect(groups[1].products.map((p) => p.name)).toEqual(['OneBlade', 'OneBlade Pro'])
  })

  // A product with no brand must stay reachable, in a group of its own.
  it('puts products with no brand in a last group', () => {
    const groups = groupProductsByBrand(products)
    expect(groups[2]).toEqual({ brand: null, products: [products[3]] })
  })

  // Names the collator treats as equal must still sort the same way whatever
  // order the links were fetched in.
  it('breaks name ties on the slug, for products and brands', () => {
    const cafe = { name: 'Cafe', slug: 'cafe-b', brand: { name: 'Acme', slug: 'acme-2' } }
    const cafeAccented = { name: 'Café', slug: 'cafe-a', brand: { name: 'ACME', slug: 'acme-1' } }
    const sameBrand = { ...cafe, brand: cafeAccented.brand }
    for (const input of [[cafe, cafeAccented], [cafeAccented, cafe]]) {
      expect(groupProductsByBrand(input).map((g) => g.brand?.slug)).toEqual(['acme-1', 'acme-2'])
    }
    for (const input of [[sameBrand, cafeAccented], [cafeAccented, sameBrand]]) {
      expect(groupProductsByBrand(input)[0].products.map((p) => p.slug)).toEqual(['cafe-a', 'cafe-b'])
    }
  })

  it('returns no group for no product', () => {
    expect(groupProductsByBrand([])).toEqual([])
  })
})

describe('filterCompatibleProducts', () => {
  it('matches the product name, ignoring case', () => {
    expect(filterCompatibleProducts(products, 'oneblade').map((p) => p.name)).toEqual([
      'OneBlade Pro',
      'OneBlade',
    ])
  })

  it('matches the brand name', () => {
    expect(filterCompatibleProducts(products, 'BRAUN')).toHaveLength(2)
  })

  it('matches a reference, ignoring spaces and punctuation', () => {
    expect(filterCompatibleProducts(products, 'qp 6520-30').map((p) => p.name)).toEqual([
      'OneBlade Pro',
    ])
  })

  it('ignores accents', () => {
    const accented = [{ name: 'Rasoir électrique', slug: 'rasoir', brand: null }]
    expect(filterCompatibleProducts(accented, 'electrique')).toHaveLength(1)
  })

  it('keeps every product for an empty query', () => {
    expect(filterCompatibleProducts(products, '  ')).toHaveLength(products.length)
    expect(filterCompatibleProducts(products, '-/')).toHaveLength(products.length)
  })

  it('returns nothing when no product matches', () => {
    expect(filterCompatibleProducts(products, 'dyson')).toEqual([])
  })
})

describe('isActiveFilterQuery', () => {
  it('is active for a query with letters or digits', () => {
    expect(isActiveFilterQuery('qp')).toBe(true)
    expect(isActiveFilterQuery(' 9 ')).toBe(true)
  })

  // Characters the filter ignores must not present every product as a match.
  it('is inactive for a query the filter ignores entirely', () => {
    expect(isActiveFilterQuery('')).toBe(false)
    expect(isActiveFilterQuery('   ')).toBe(false)
    expect(isActiveFilterQuery('-/')).toBe(false)
  })
})

describe('limitProductGroups', () => {
  const groups = groupProductsByBrand(products)

  it('keeps the first products across groups and drops emptied groups', () => {
    const limited = limitProductGroups(groups, 3)
    expect(limited.map((g) => g.brand?.name ?? null)).toEqual(['Braun', 'Philips'])
    expect(limited[1].products.map((p) => p.name)).toEqual(['OneBlade'])
  })

  it('keeps every group under the limit', () => {
    expect(limitProductGroups(groups, 50)).toEqual(groups)
  })
})

describe('resolveCompatibleProductsView', () => {
  // One more product than the collapsed view shows, all from one brand, named
  // so their display order is model-01, model-02, … model-13.
  const many = Array.from({ length: COLLAPSED_COMPATIBLE_PRODUCTS_COUNT + 1 }, (_, i) => {
    const n = String(i + 1).padStart(2, '0')
    return { name: `Model ${n}`, slug: `model-${n}`, brand: braun, references: [{ value: `REF-${n}` }] }
  })

  it('shows every product of a short list', () => {
    const view = resolveCompatibleProductsView(products, '', false)
    expect(view.visibleSlugs).toEqual(new Set(products.map((p) => p.slug)))
    expect(view.matchCount).toBe(products.length)
  })

  it('collapses a long list to the first products in display order', () => {
    const view = resolveCompatibleProductsView(many, '', false)
    expect(view.visibleSlugs.size).toBe(COLLAPSED_COMPATIBLE_PRODUCTS_COUNT)
    expect(view.visibleSlugs.has('model-01')).toBe(true)
    expect(view.visibleSlugs.has('model-13')).toBe(false)
  })

  it('shows every product of a long list once expanded', () => {
    const view = resolveCompatibleProductsView(many, '', true)
    expect(view.visibleSlugs.size).toBe(many.length)
  })

  // The visitor is looking for one product: a match past the collapse
  // threshold must not be hidden.
  it('never collapses a filtered list', () => {
    const view = resolveCompatibleProductsView(many, 'ref 13', false)
    expect(view.visibleSlugs).toEqual(new Set(['model-13']))
    expect(view.matchCount).toBe(1)
  })

  it('reports no match without hiding the count of products', () => {
    const view = resolveCompatibleProductsView(many, 'zzz', false)
    expect(view.visibleSlugs.size).toBe(0)
    expect(view.matchCount).toBe(0)
  })

  // A query of ignored characters behaves as empty: the list stays collapsed.
  it('treats a punctuation-only query as no filter', () => {
    const view = resolveCompatibleProductsView(many, ' - ', false)
    expect(view.visibleSlugs.size).toBe(COLLAPSED_COMPATIBLE_PRODUCTS_COUNT)
    expect(view.matchCount).toBe(many.length)
  })
})
