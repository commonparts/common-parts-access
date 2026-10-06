import { describe, expect, it } from 'vitest'
import {
  filterCompatibleProducts,
  groupProductsByBrand,
  limitProductGroups,
} from './compatible-products'

const philips = { name: 'Philips', slug: 'philips' }
const braun = { name: 'Braun', slug: 'braun' }

const products = [
  { name: 'Series 10', brand: braun, references: [{ value: '5040' }] },
  { name: 'OneBlade Pro', brand: philips, references: [{ value: 'QP6520/30' }] },
  { name: 'Series 9', brand: braun, references: [] },
  { name: 'Unbranded trimmer', brand: null },
  { name: 'OneBlade', brand: philips, references: [{ value: 'QP2520' }] },
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
    const accented = [{ name: 'Rasoir électrique', brand: null }]
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
