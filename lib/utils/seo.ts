/**
 * SEO utilities: canonical paths, schema.org structured data builders and the
 * labels the metadata copy is built from. The copy itself is the `Seo`
 * messages, in the page's locale. Part pages are standalone entry points
 * (docs/user-flows.md P-4) — titles and descriptions must carry the brand and
 * product name for query matching.
 */

import type { Metadata } from 'next'
import type { Locale } from 'next-intl'

import { getPathname } from '@/i18n/navigation'
import { truncateText } from '@/lib/utils/formatters'
import { absoluteAppUrl, isValidHttpUrl } from '@/lib/utils/validation'
import { resolveStorageUrl } from '@/lib/storage/url'
import type { PartSeoData, PartSeoProductFit } from '@/types/parts'

/** Search snippets are cut around 155-160 characters; stay within that budget. */
const SEO_DESCRIPTION_MAX_LENGTH = 160

/** Cuts a meta description to the search snippet budget. */
export function seoDescription(text: string): string {
  return truncateText(text, SEO_DESCRIPTION_MAX_LENGTH)
}

/** Absolute URL of an in-app path in a locale: "/browse" in fr gives "<APP_URL>/fr/browse". */
export function localizedUrl(path: string, locale: Locale): string {
  return absoluteAppUrl(getPathname({ href: path, locale }))
}

/**
 * The canonical and Open Graph URLs of a public page in its locale, with the
 * page's own Open Graph fields merged in, so no page can drop `og:url`. The
 * hreflang alternates are not declared here: the next-intl middleware sends
 * them in a `Link` header (docs/I18N.md).
 */
export function localizedPageMetadata(
  path: string,
  locale: Locale,
  openGraph?: NonNullable<Metadata['openGraph']>,
): Pick<Metadata, 'alternates' | 'openGraph'> {
  const url = localizedUrl(path, locale)
  return { alternates: { canonical: url }, openGraph: { ...openGraph, url } }
}

/** Canonical path for a part page (public route is /parts — issue #258). */
export function partCanonicalPath(slug: string): string {
  return `/parts/${slug}`
}

/** Canonical path for a product page. */
export function productCanonicalPath(slug: string): string {
  return `/product/${slug}`
}

/**
 * "Bosch MUM5" — the brand + product the part fits, from the first linked
 * product, and null when the part links to none. Since #315 a part has no
 * brand of its own to fall back on: a part with no product has no brand.
 */
export function partFitLabel(part: Pick<PartSeoData, 'products'>): string | null {
  const fit = part.products[0]
  return fit ? productFullName(fit.brand?.name ?? null, fit.name) : null
}

/** "Bosch MUM5" — the brand folded into the product name for query matching. */
export function productFullName(brandName: string | null, productName: string): string {
  return [brandName, productName].filter(Boolean).join(' ')
}

/**
 * Builds the schema.org JSON-LD graph for a part page.
 *
 * The main entity is a 3DModel (CreativeWork) rather than a Product: parts
 * are free printable files with no offers/price, so Product markup would not
 * qualify for rich results and would misrepresent the page. A BreadcrumbList
 * (a supported rich result type) is included alongside it so the Google Rich
 * Results Test detects a valid rich result.
 *
 * Attribution follows P-2: the creator is the original author for curated
 * parts, falling back to the uploader; the license links to the effective
 * (source-first) license text. `description` is the page's meta description
 * and `rootTrail` the breadcrumb root of a part fitting no product, both in
 * the page's locale, which `locale` is.
 */
export function buildPartJsonLd(
  part: PartSeoData,
  description: string,
  rootTrail: BreadcrumbJsonLdItem[],
  locale: Locale,
): Record<string, unknown> {
  const pagePath = partCanonicalPath(part.slug)
  const url = localizedUrl(pagePath, locale)
  const image = resolveStorageUrl(part.thumbnailUrl)
  const creatorName = part.originalAuthor || part.authorName

  const partEntity: Record<string, unknown> = {
    // Schema.org vocabulary, not ours: `3DModel` is the registered type name
    // (issue #314 renamed the entity everywhere else). An invented `3DPart`
    // would make the entity unrecognized and fail structured data validation.
    '@type': '3DModel',
    '@id': `${url}#part`,
    name: part.name,
    url,
    description,
  }
  if (image) partEntity.image = image
  if (part.licenseUrl) partEntity.license = part.licenseUrl
  if (creatorName) {
    partEntity.creator = {
      '@type': 'Person',
      name: creatorName,
      // Only the curated source author has a known profile URL. Curation
      // input — include it only when it is a well-formed http(s) URL so a
      // bad value cannot fail structured data validation.
      ...(part.originalAuthor &&
      part.originalAuthorUrl &&
      isValidHttpUrl(part.originalAuthorUrl)
        ? { url: part.originalAuthorUrl }
        : {}),
    }
  }
  if (part.createdAt) partEntity.datePublished = part.createdAt
  if (part.updatedAt) partEntity.dateModified = part.updatedAt
  if (part.tags.length > 0) partEntity.keywords = part.tags.join(', ')
  if (part.products.length > 0) {
    // The products this part fits — expressed as the subject of the part.
    // Typed as Thing, not Product: Google treats every Product entity as a
    // product-snippet candidate and flags it invalid without offers/review/
    // aggregateRating, which free printable parts never have. The brand is
    // folded into the name to keep it available for query matching.
    partEntity.about = part.products.map((product) => ({
      '@type': 'Thing',
      name: productFullName(product.brand?.name ?? null, product.name),
    }))
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [partEntity, buildBreadcrumbList(pagePath, buildPartBreadcrumbTrail(part, rootTrail), locale)],
  }
}

/**
 * Serializes JSON-LD for embedding in a <script> tag. Escapes "<" so
 * user-supplied strings (names, descriptions) cannot break out of the
 * script element (e.g. via "</script>").
 */
export function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

// ============================================================================
// Navigation pages (issue #256): /brands/[brand] and /brands/[brand]/[category]
// are primary SEO entry points ("spare part [brand] [category]", Flow P2).
// ============================================================================

/** Canonical path for a brand page. */
export function brandCanonicalPath(brandSlug: string): string {
  return `/brands/${brandSlug}`
}

/** Canonical path for a brand-scoped category listing. */
export function brandCategoryCanonicalPath(brandSlug: string, categorySlug: string): string {
  return `${brandCanonicalPath(brandSlug)}/${categorySlug}`
}

/** Canonical path for a category drill-down page (issue #276). */
export function categoryCanonicalPath(categorySlug: string): string {
  return `/categories/${categorySlug}`
}

export interface BreadcrumbJsonLdItem {
  name: string
  /**
   * In-app path. Ignored on the last item: the current page URL is implied
   * (Google's guidelines), and the visible trail does not link it either.
   */
  path?: string
}

/**
 * The BreadcrumbList entity without `@context`, so it can sit in a part
 * page's `@graph` as well as stand alone. The last item is emitted without
 * `item` per Google's guidelines.
 */
function buildBreadcrumbList(
  pagePath: string,
  items: BreadcrumbJsonLdItem[],
  locale: Locale,
): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${localizedUrl(pagePath, locale)}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.path && index < items.length - 1 ? { item: localizedUrl(item.path, locale) } : {}),
    })),
  }
}

/**
 * Builds a standalone BreadcrumbList JSON-LD document for navigation pages.
 * BreadcrumbList is a supported Google rich result type.
 */
export function buildBreadcrumbJsonLd(
  pagePath: string,
  items: BreadcrumbJsonLdItem[],
  locale: Locale,
): Record<string, unknown> {
  return { '@context': 'https://schema.org', ...buildBreadcrumbList(pagePath, items, locale) }
}

/** Maps a breadcrumb trail to the props of the visible Breadcrumbs component. */
export function toBreadcrumbLinks(
  items: BreadcrumbJsonLdItem[],
): { label: string; href?: string }[] {
  return items.map((item) => ({ label: item.name, href: item.path }))
}

/**
 * Brand › Category › Product (Flow P2) — the one trail shared by product and
 * part pages, visible and in structured data alike. The brand crumb resolves
 * to the brand page and the category crumb to the brand-scoped category
 * listing; that listing needs the brand slug, so the category stays unlinked
 * for the (curation-anomalous) product without a brand. `name` is the name
 * shown on the page, which may be a regional commercial name.
 */
export function buildProductBreadcrumbTrail(
  product: Pick<PartSeoProductFit, 'name' | 'slug' | 'brand' | 'category'>,
): BreadcrumbJsonLdItem[] {
  const { brand, category } = product
  const trail: BreadcrumbJsonLdItem[] = []
  if (brand) trail.push({ name: brand.name, path: brandCanonicalPath(brand.slug) })
  if (category) {
    trail.push({
      name: category.name,
      path: brand ? brandCategoryCanonicalPath(brand.slug, category.slug) : undefined,
    })
  }
  trail.push({ name: product.name, path: productCanonicalPath(product.slug) })
  return trail
}

/**
 * Home › Browse, the root of the navigation pages' trails, with the labels
 * of the page's locale.
 */
export function rootBreadcrumbTrail(labels: { home: string; browse: string }): BreadcrumbJsonLdItem[] {
  return [
    { name: labels.home, path: '/' },
    { name: labels.browse, path: '/browse' },
  ]
}

/**
 * Part page trail: the primary fitted product's trail followed by the part.
 * A part fitting no product has no brand or category to show and falls back
 * to `rootTrail` (Home › Browse).
 */
export function buildPartBreadcrumbTrail(
  part: PartSeoData,
  rootTrail: BreadcrumbJsonLdItem[],
): BreadcrumbJsonLdItem[] {
  const fit = part.products[0]
  const lead = fit ? buildProductBreadcrumbTrail(fit) : rootTrail
  return [...lead, { name: part.name, path: partCanonicalPath(part.slug) }]
}
