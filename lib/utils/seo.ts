/**
 * SEO utilities: metadata copy and schema.org structured data builders.
 * Part pages are standalone entry points (docs/user-flows.md P-4) — titles and
 * descriptions must carry the brand and product name for query matching.
 */

import { APP_NAME } from '@/lib/utils/constants'
import { truncateText } from '@/lib/utils/formatters'
import { absoluteAppUrl, isValidHttpUrl } from '@/lib/utils/validation'
import { resolveStorageUrl } from '@/lib/storage/url'
import type { PartSeoData, PartSeoProductFit } from '@/types/parts'

/** Search snippets are cut around 155-160 characters; stay within that budget. */
const SEO_DESCRIPTION_MAX_LENGTH = 160

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
function primaryFitLabel(part: PartSeoData): string | null {
  const fit = part.products[0]
  return fit ? productFullName(fit.brand?.name ?? null, fit.name) : null
}

/** "Bosch MUM5" — the brand folded into the product name for query matching. */
function productFullName(brandName: string | null, productName: string): string {
  return [brandName, productName].filter(Boolean).join(' ')
}

/** Page title carrying the part name plus the brand/product it fits. */
export function buildPartSeoTitle(part: PartSeoData): string {
  const fit = primaryFitLabel(part)
  return fit ? `${part.name} — spare part for ${fit}` : `${part.name} — spare part`
}

/**
 * Meta description leading with the brand and product name (issue #252:
 * query matching), followed by the part's own description when available.
 */
export function buildPartSeoDescription(part: PartSeoData): string {
  const fit = primaryFitLabel(part)
  const lead = fit
    ? `Printable spare part for ${fit}: ${part.name}.`
    : `Printable spare part: ${part.name}.`
  const body =
    part.description?.trim() ||
    `Download the 3D model file with license and attribution details on ${APP_NAME}.`
  return truncateText(`${lead} ${body}`, SEO_DESCRIPTION_MAX_LENGTH)
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
 * (source-first) license text.
 */
export function buildPartJsonLd(part: PartSeoData): Record<string, unknown> {
  const pagePath = partCanonicalPath(part.slug)
  const url = absoluteAppUrl(pagePath)
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
    description: buildPartSeoDescription(part),
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
    '@graph': [partEntity, buildBreadcrumbList(pagePath, buildPartBreadcrumbTrail(part))],
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

/** Page title for a brand page: "Bosch spare parts". */
export function buildBrandSeoTitle(brandName: string): string {
  return `${brandName} spare parts`
}

/**
 * Meta description for a brand page, leading with the brand name and the
 * as-is parts count (Flow P2: counts are never hidden or inflated).
 */
export function buildBrandSeoDescription(input: {
  brandName: string
  partsCount: number
  brandDescription?: string | null
}): string {
  const lead =
    input.partsCount > 0
      ? `${input.partsCount} printable spare ${input.partsCount === 1 ? 'part' : 'parts'} for ${input.brandName} products.`
      : `Printable spare parts for ${input.brandName} products.`
  const body =
    input.brandDescription?.trim() ||
    `Browse by category and download with license and attribution details on ${APP_NAME}.`
  return truncateText(`${lead} ${body}`, SEO_DESCRIPTION_MAX_LENGTH)
}

/** Page title for a brand-scoped category listing: "Bosch Dishwashers spare parts". */
export function buildBrandCategorySeoTitle(brandName: string, categoryName: string): string {
  return `${brandName} ${categoryName} spare parts`
}

/** Meta description for a brand-scoped category listing. */
export function buildBrandCategorySeoDescription(input: {
  brandName: string
  categoryName: string
  productCount: number
}): string {
  const lead =
    input.productCount > 0
      ? `Printable spare parts for ${input.productCount} ${input.brandName} ${
          input.productCount === 1 ? 'product' : 'products'
        } in ${input.categoryName}.`
      : `Printable spare parts for ${input.brandName} products in ${input.categoryName}.`
  return truncateText(
    `${lead} Download with license and attribution details on ${APP_NAME}.`,
    SEO_DESCRIPTION_MAX_LENGTH,
  )
}

/** Canonical path for a category drill-down page (issue #276). */
export function categoryCanonicalPath(categorySlug: string): string {
  return `/categories/${categorySlug}`
}

/** Page title for a category page: "Vacuum Cleaner spare parts". */
export function buildCategorySeoTitle(categoryName: string): string {
  return `${categoryName} spare parts`
}

/**
 * Meta description for a category page. Leads with the subtree-aggregated
 * counts when parts exist; zero-part categories get generic copy instead of
 * a "0 parts" search snippet — same rule as buildBrandSeoDescription. The
 * show-zeros rule (Flow P2) governs on-page counts, not SERP copy.
 */
export function buildCategorySeoDescription(input: {
  categoryName: string
  partsCount: number
  productCount: number
}): string {
  const lead =
    input.partsCount > 0
      ? `${input.partsCount} printable spare ${input.partsCount === 1 ? 'part' : 'parts'} across ${
          input.productCount
        } ${input.productCount === 1 ? 'product' : 'products'} in ${input.categoryName}.`
      : `Printable spare parts for ${input.categoryName} products.`
  return truncateText(
    `${lead} Browse by subcategory and brand on ${APP_NAME}.`,
    SEO_DESCRIPTION_MAX_LENGTH,
  )
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
): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${absoluteAppUrl(pagePath)}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.path && index < items.length - 1 ? { item: absoluteAppUrl(item.path) } : {}),
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
): Record<string, unknown> {
  return { '@context': 'https://schema.org', ...buildBreadcrumbList(pagePath, items) }
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
 * Part page trail: the primary fitted product's trail followed by the part.
 * A part fitting no product has no brand or category to show and falls back
 * to Home › Browse.
 */
export function buildPartBreadcrumbTrail(part: PartSeoData): BreadcrumbJsonLdItem[] {
  const fit = part.products[0]
  const lead: BreadcrumbJsonLdItem[] = fit
    ? buildProductBreadcrumbTrail(fit)
    : [
        { name: 'Home', path: '/' },
        { name: 'Browse', path: '/browse' },
      ]
  return [...lead, { name: part.name, path: partCanonicalPath(part.slug) }]
}

/** Page title for a product page: "Bosch MUM5 spare parts". */
export function buildProductSeoTitle(brandName: string | null, productName: string): string {
  return `${productFullName(brandName, productName)} spare parts`
}

/**
 * Meta description for a product page, leading with the brand and product
 * name. No count: the page covers parts and open requests alike, and an
 * empty product invites a request rather than showing "0 parts" in a SERP.
 */
export function buildProductSeoDescription(input: {
  brandName: string | null
  productName: string
  categoryName: string | null
}): string {
  const fullName = productFullName(input.brandName, input.productName)
  const lead = input.categoryName
    ? `Printable spare parts for the ${fullName} (${input.categoryName}).`
    : `Printable spare parts for the ${fullName}.`
  return truncateText(
    `${lead} Download with license and attribution details, or request a missing part on ${APP_NAME}.`,
    SEO_DESCRIPTION_MAX_LENGTH,
  )
}
