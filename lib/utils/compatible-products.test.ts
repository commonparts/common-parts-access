import { describe, expect, it } from 'vitest'
import {
  filterCompatibleProducts,
  groupProductsByBrand,
  isActiveFilterQuery,
  limitProductGroups,
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
