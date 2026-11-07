import { describe, expect, it } from 'vitest'

import { buildSitemap, categoryPathSlugs, type SitemapProduct } from '@/lib/utils/sitemap'
import { absoluteAppUrl } from '@/lib/utils/validation'

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

describe('buildSitemap', () => {
  /** The in-app paths of the English entries. */
  const pathsOf = (entries: { url: string }[]): string[] => {
    const root = absoluteAppUrl('/en')
    return entries
      .filter(({ url }) => url === root || url.startsWith(`${root}/`))
      .map(({ url }) => url.slice(root.length) || '/')
  }

  it('lists roots, contributor guide, category ancestors, brand, brand-category, product and part', () => {
    expect(pathsOf(buildSitemap([product()], [{ slug: 'knob', updatedAt: null }]))).toEqual([
      '/',
      '/browse',
      '/contributing',
      '/categories/appliances',
      '/categories/kitchen-machine',
      '/brands/bosch',
      '/brands/bosch/kitchen-machine',
      '/product/bosch-mum5',
      '/parts/knob',
    ])
  })

  it('lists every path once per locale, with its localized URL and date', () => {
    expect(buildSitemap([], [{ slug: 'knob', updatedAt: '2026-09-01T00:00:00Z' }]).slice(-2)).toEqual([
      { url: absoluteAppUrl('/en/parts/knob'), lastModified: '2026-09-01T00:00:00Z' },
      { url: absoluteAppUrl('/fr/parts/knob'), lastModified: '2026-09-01T00:00:00Z' },
    ])
    expect(buildSitemap([], []).map((entry) => entry.url)).toEqual(
      ['/en', '/fr', '/en/browse', '/fr/browse', '/en/contributing', '/fr/contributing'].map((path) =>
        absoluteAppUrl(path),
      ),
    )
  })

  it('deduplicates brands and categories shared by several products', () => {
    const paths = pathsOf(buildSitemap([product(), product({ slug: 'bosch-mum6' })], []))
    expect(paths.filter((path) => path === '/brands/bosch')).toHaveLength(1)
    expect(paths.filter((path) => path === '/categories/appliances')).toHaveLength(1)
  })

  it('skips the brand-category listing when the product has no brand', () => {
    const paths = pathsOf(buildSitemap([product({ brandSlug: null })], []))
    expect(paths).toContain('/categories/kitchen-machine')
    expect(paths.some((path) => path.startsWith('/brands/'))).toBe(false)
  })

  it('caps the entries of all locales at the protocol limit, dropping parts first', () => {
    const parts = Array.from({ length: 50_000 }, (_, i) => ({ slug: `p-${i}`, updatedAt: null }))
    const entries = buildSitemap([product()], parts)
    expect(entries).toHaveLength(50_000)
    expect(entries.map((entry) => entry.url)).toContain(absoluteAppUrl('/fr/product/bosch-mum5'))
  })
})
