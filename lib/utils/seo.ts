/**
 * SEO utilities: metadata copy and schema.org structured data builders.
 * Part pages are standalone entry points (docs/user-flows.md P-4) — titles and
 * descriptions must carry the brand and product name for query matching.
 */

import { APP_NAME, APP_URL } from '@/lib/utils/constants'
import { truncateText } from '@/lib/utils/formatters'
import { absoluteAppUrl, isValidHttpUrl } from '@/lib/utils/validation'
import { resolveStorageUrl } from '@/lib/storage/url'
import type { ModelSeoData } from '@/types/models'

/** Search snippets are cut around 155-160 characters; stay within that budget. */
const SEO_DESCRIPTION_MAX_LENGTH = 160

/** Canonical URL for a part page (public route is /parts — issue #258). */
export function modelCanonicalUrl(slug: string): string {
  return absoluteAppUrl(`/parts/${slug}`)
}

/**
 * "Bosch MUM5" — the brand + product the part fits, from the first linked
 * product. Falls back to the model's own brand when no product is linked,
 * and null when neither exists.
 */
function primaryFitLabel(model: ModelSeoData): string | null {
  const fit = model.products[0]
  if (fit) return [fit.brandName, fit.name].filter(Boolean).join(' ')
  return model.brandName
}

/** Page title carrying the part name plus the brand/product it fits. */
export function buildModelSeoTitle(model: ModelSeoData): string {
  const fit = primaryFitLabel(model)
  return fit ? `${model.name} — spare part for ${fit}` : `${model.name} — spare part`
}

/**
 * Meta description leading with the brand and product name (issue #252:
 * query matching), followed by the model's own description when available.
 */
export function buildModelSeoDescription(model: ModelSeoData): string {
  const fit = primaryFitLabel(model)
  const lead = fit
    ? `Printable spare part for ${fit}: ${model.name}.`
    : `Printable spare part: ${model.name}.`
  const body =
    model.description?.trim() ||
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
export function buildModelJsonLd(model: ModelSeoData): Record<string, unknown> {
  const url = modelCanonicalUrl(model.slug)
  const image = resolveStorageUrl(model.thumbnailUrl)
  const creatorName = model.originalAuthor || model.authorName

  const modelEntity: Record<string, unknown> = {
    '@type': '3DModel',
    '@id': `${url}#part`,
    name: model.name,
    url,
    description: buildModelSeoDescription(model),
  }
  if (image) modelEntity.image = image
  if (model.licenseUrl) modelEntity.license = model.licenseUrl
  if (creatorName) {
    modelEntity.creator = {
      '@type': 'Person',
      name: creatorName,
      // Only the curated source author has a known profile URL. Curation
      // input — include it only when it is a well-formed http(s) URL so a
      // bad value cannot fail structured data validation.
      ...(model.originalAuthor &&
      model.originalAuthorUrl &&
      isValidHttpUrl(model.originalAuthorUrl)
        ? { url: model.originalAuthorUrl }
        : {}),
    }
  }
  if (model.createdAt) modelEntity.datePublished = model.createdAt
  if (model.updatedAt) modelEntity.dateModified = model.updatedAt
  if (model.tags.length > 0) modelEntity.keywords = model.tags.join(', ')
  if (model.products.length > 0) {
    // The products this part fits — expressed as the subject of the model.
    // Typed as Thing, not Product: Google treats every Product entity as a
    // product-snippet candidate and flags it invalid without offers/review/
    // aggregateRating, which free printable parts never have. The brand is
    // folded into the name to keep it available for query matching.
    modelEntity.about = model.products.map((product) => ({
      '@type': 'Thing',
      name: [product.brandName, product.name].filter(Boolean).join(' '),
    }))
  }

  const breadcrumb = {
    '@type': 'BreadcrumbList',
    '@id': `${url}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: APP_URL },
      { '@type': 'ListItem', position: 2, name: 'Browse', item: absoluteAppUrl('/browse') },
      // Last item: no `item` — per Google, the current page URL is implied.
      { '@type': 'ListItem', position: 3, name: model.name },
    ],
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [modelEntity, breadcrumb],
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
  /** In-app path; omit on the last item — the current page URL is implied. */
  path?: string
}

/**
 * Builds a standalone BreadcrumbList JSON-LD document for navigation pages.
 * BreadcrumbList is a supported Google rich result type; the last item is
 * emitted without `item` per Google's guidelines.
 */
export function buildBreadcrumbJsonLd(
  pagePath: string,
  items: BreadcrumbJsonLdItem[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${absoluteAppUrl(pagePath)}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: absoluteAppUrl(item.path) } : {}),
    })),
  }
}
