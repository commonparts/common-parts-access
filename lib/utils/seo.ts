/**
 * SEO utilities: metadata copy and schema.org structured data builders.
 * Part pages are standalone entry points (docs/user-flows.md P-4) — titles and
 * descriptions must carry the brand and product name for query matching.
 */

import { APP_NAME, APP_URL } from '@/lib/utils/constants'
import { truncateText } from '@/lib/utils/formatters'
import { absoluteAppUrl } from '@/lib/utils/validation'
import { resolveStorageUrl } from '@/lib/storage/url'
import type { ModelSeoData } from '@/types/models'

/** Search snippets are cut around 155-160 characters; stay within that budget. */
const SEO_DESCRIPTION_MAX_LENGTH = 160

/** Canonical URL for a part page. */
export function modelCanonicalUrl(slug: string): string {
  return absoluteAppUrl(`/model/${slug}`)
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
      // Only the curated source author has a known profile URL.
      ...(model.originalAuthor && model.originalAuthorUrl
        ? { url: model.originalAuthorUrl }
        : {}),
    }
  }
  if (model.createdAt) modelEntity.datePublished = model.createdAt
  if (model.updatedAt) modelEntity.dateModified = model.updatedAt
  if (model.tags.length > 0) modelEntity.keywords = model.tags.join(', ')
  if (model.products.length > 0) {
    // The products this part fits — expressed as the subject of the model.
    modelEntity.about = model.products.map((product) => ({
      '@type': 'Product',
      name: product.name,
      ...(product.brandName ? { brand: { '@type': 'Brand', name: product.brandName } } : {}),
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
