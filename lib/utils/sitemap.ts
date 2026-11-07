/**
 * Sitemap URL derivation (issue #257). The sitemap lists only what public
 * navigation shows: listed products (products.is_listed), the brands and
 * categories holding one, and published parts, once per locale. /search is
 * never listed — its pages are noindex.
 */

import type { MetadataRoute } from 'next'

import { routing } from '@/i18n/routing'
import {
  brandCanonicalPath,
  brandCategoryCanonicalPath,
  categoryCanonicalPath,
  localizedUrl,
  partCanonicalPath,
  productCanonicalPath,
} from '@/lib/utils/seo'

/** The sitemap protocol's limit on URLs per file (sitemaps.org). */
const SITEMAP_MAX_URLS = 50_000

/** Navigation roots always listed, ahead of the derived entity pages. */
const SITEMAP_STATIC_PATHS = ['/', '/browse'] as const

/** A listed product with the navigation it places itself in. */
export interface SitemapProduct {
  slug: string
  updatedAt: string | null
  brandSlug: string | null
  categorySlug: string | null
  /** Materialized category path, e.g. "/appliances/dishwasher/" (slug chain). */
  categoryPath: string | null
}

export interface SitemapPart {
  slug: string
  updatedAt: string | null
}

interface SitemapPath {
  path: string
  lastModified?: string
}

/**
 * Category slugs of a materialized path, root first: "/appliances/dishwasher/"
 * gives ["appliances", "dishwasher"]. Path segments are category slugs, and
 * category slugs are unique — the same invariant fetch_category_page relies on
 * when it matches a subtree with starts_with(path).
 */
export function categoryPathSlugs(path: string): string[] {
  return path.split('/').filter(Boolean)
}

/**
 * Builds the sitemap entries: each in-app path, in priority order (navigation
 * roots, categories, brands, brand-scoped category listings, products, parts),
 * once per locale with its localized absolute URL. The hreflang alternates are
 * not repeated here: the next-intl middleware sends them in a `Link` header.
 *
 * - A category is listed when its subtree holds a listed product, so every
 *   ancestor on a listed product's category path is included
 *   (fetch_browse_nav / fetch_category_page).
 * - A brand is listed when it holds a listed product, and its category chips
 *   are the direct categories of those products (fetch_brand_nav) — the pages
 *   /brands/[brand]/[category] that product breadcrumbs link to.
 *
 * Duplicates are removed and the entries are capped at SITEMAP_MAX_URLS; the
 * priority order decides what is dropped first (parts, then products), and a
 * path keeps all its locales or none.
 */
export function buildSitemap(products: SitemapProduct[], parts: SitemapPart[]): MetadataRoute.Sitemap {
  const categories = new Set<string>()
  const brands = new Set<string>()
  const brandCategories = new Set<string>()

  for (const product of products) {
    if (product.categoryPath) {
      for (const slug of categoryPathSlugs(product.categoryPath)) {
        categories.add(categoryCanonicalPath(slug))
      }
    }
    if (product.brandSlug) {
      brands.add(brandCanonicalPath(product.brandSlug))
      if (product.categorySlug) {
        brandCategories.add(brandCategoryCanonicalPath(product.brandSlug, product.categorySlug))
      }
    }
  }

  const withDate = (path: string, updatedAt: string | null): SitemapPath =>
    updatedAt ? { path, lastModified: updatedAt } : { path }

  const paths: SitemapPath[] = [
    ...SITEMAP_STATIC_PATHS.map((path) => ({ path })),
    ...[...categories].sort().map((path) => ({ path })),
    ...[...brands].sort().map((path) => ({ path })),
    ...[...brandCategories].sort().map((path) => ({ path })),
    ...products.map((product) => withDate(productCanonicalPath(product.slug), product.updatedAt)),
    ...parts.map((part) => withDate(partCanonicalPath(part.slug), part.updatedAt)),
  ]

  return paths
    .slice(0, Math.floor(SITEMAP_MAX_URLS / routing.locales.length))
    .flatMap(({ path, lastModified }) =>
      routing.locales.map((locale) => ({ url: localizedUrl(path, locale), ...(lastModified ? { lastModified } : {}) })),
    )
}
