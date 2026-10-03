import { describe, expect, it } from 'vitest'

import { buildSitemapPaths, categoryPathSlugs, type SitemapProduct } from '@/lib/utils/sitemap'

function product(overrides: Partial<SitemapProduct> = {}): SitemapProduct {
  return {
    slug: 'bosch-mum5',
    updatedAt: '2026-09-01T00:00:00Z',
    brandSlug: 'bosch',
    categorySlug: 'kitchen-machine',
    categoryPath: '/appliances/kitchen-machine/',
    ...overrides,
  }
}

describe('categoryPathSlugs', () => {
  it('splits a materialized path root first', () => {
    expect(categoryPathSlugs('/appliances/dishwasher/')).toEqual(['appliances', 'dishwasher'])
  })

  it('returns nothing for an empty path', () => {
    expect(categoryPathSlugs('/')).toEqual([])
  })
})

describe('buildSitemapPaths', () => {
  it('lists roots, category ancestors, brand, brand-category, product and part', () => {
    const paths = buildSitemapPaths([product()], [{ slug: 'knob', updatedAt: null }])
    expect(paths).toEqual([
      { path: '/' },
      { path: '/browse' },
      { path: '/categories/appliances' },
      { path: '/categories/kitchen-machine' },
      { path: '/brands/bosch' },
      { path: '/brands/bosch/kitchen-machine' },
      { path: '/product/bosch-mum5', lastModified: '2026-09-01T00:00:00Z' },
      { path: '/parts/knob' },
    ])
  })

  it('deduplicates brands and categories shared by several products', () => {
    const paths = buildSitemapPaths(
      [product(), product({ slug: 'bosch-mum6' })],
      [],
    ).map((entry) => entry.path)
    expect(paths.filter((path) => path === '/brands/bosch')).toHaveLength(1)
    expect(paths.filter((path) => path === '/categories/appliances')).toHaveLength(1)
  })

  it('skips the brand-category listing when the product has no brand', () => {
    const paths = buildSitemapPaths([product({ brandSlug: null })], []).map((entry) => entry.path)
    expect(paths).toContain('/categories/kitchen-machine')
    expect(paths.some((path) => path.startsWith('/brands/'))).toBe(false)
  })

  it('caps the output at the protocol limit, dropping parts first', () => {
    const parts = Array.from({ length: 50_000 }, (_, i) => ({ slug: `p-${i}`, updatedAt: null }))
    const paths = buildSitemapPaths([product()], parts)
    expect(paths).toHaveLength(50_000)
    expect(paths.map((entry) => entry.path)).toContain('/product/bosch-mum5')
  })
})
