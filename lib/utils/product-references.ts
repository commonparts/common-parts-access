import type { VisitorLocale } from './locale'
import { isValidUuid } from './validation'

export const PRODUCT_REFERENCE_TYPES = ['manufacturer_ref', 'commercial_name', 'ean'] as const
export type ProductReferenceType = (typeof PRODUCT_REFERENCE_TYPES)[number]

/** A known reference of a product, as the product page reads it. */
export interface ProductReference {
  id: string
  value: string
  type: ProductReferenceType
  /** ISO 3166-1 alpha-2, null = every region. */
  region: string | null
  /** BCP 47, null = unspecified. */
  language: string | null
}

/**
 * Picks the regional commercial name to show a visitor, or null to keep
 * `products.name`.
 *
 * Only a commercial name tagged with the visitor's exact region qualifies —
 * a region-less commercial name is an alias, not a replacement for the
 * canonical name, and a visitor without a known region always sees the
 * canonical name. When several names share the region (a bilingual market),
 * the one in the visitor's language wins, then one without a language, then
 * the first listed.
 */
export function pickRegionalName(
  references: readonly ProductReference[],
  locale: VisitorLocale,
): string | null {
  if (!locale.region) return null

  const candidates = references.filter(
    (reference) => reference.type === 'commercial_name' && reference.region === locale.region,
  )

  const languageRank = (reference: ProductReference): number => {
    if (!reference.language) return 1
    const primary = reference.language.split('-')[0].toLowerCase()
    return primary === locale.language ? 0 : 2
  }

  const [best] = [...candidates].sort((a, b) => languageRank(a) - languageRank(b))
  return best?.value ?? null
}

/** References of one type, for display. */
export interface ProductReferenceGroup {
  type: ProductReferenceType
  references: ProductReference[]
}

/**
 * Groups a product's references by type, in PRODUCT_REFERENCE_TYPES order,
 * leaving out empty groups and the commercial name already shown as the
 * product's title (listing it again under "Also sold as" would be noise).
 */
export function groupProductReferences(
  references: readonly ProductReference[],
  displayedName: string,
): ProductReferenceGroup[] {
  return PRODUCT_REFERENCE_TYPES.map((type) => ({
    type,
    references: references.filter(
      (reference) =>
        reference.type === type && !(type === 'commercial_name' && reference.value === displayedName),
    ),
  })).filter((group) => group.references.length > 0)
}

/** Longest reference value `product_references` accepts (its CHECK constraint). */
export const MAX_REFERENCE_LENGTH = 200

// Digit counts of EAN-8, UPC-A (12) and EAN-13 barcodes.
const BARCODE_DIGIT_COUNTS = new Set([8, 12, 13])

/**
 * Guesses the type of a reference a visitor typed, for the pending suggestion
 * (issue #320): digits only with a barcode length is an EAN, anything with a
 * digit is a manufacturer reference ("QP6520/20"), plain words are a
 * commercial name. Whoever validates the suggestion can correct it.
 */
export function inferReferenceType(value: string): ProductReferenceType {
  if (/^[\d\s-]+$/.test(value)) {
    const digits = value.replace(/\D/g, '').length
    if (BARCODE_DIGIT_COUNTS.has(digits)) return 'ean'
  }
  return /\d/.test(value) ? 'manufacturer_ref' : 'commercial_name'
}

/** A validated "this reference belongs to that product" suggestion. */
export interface ReferenceAttachment {
  productId: string
  value: string
}

export type ReferenceAttachmentValidation =
  | { ok: true; value: ReferenceAttachment }
  | { ok: false; error: string }

/**
 * Validates the body of POST /api/product-references. Does not throw; the
 * route maps `ok: false` to a 400. A value made only of separators is left to
 * the database, whose normalization rule rejects it.
 */
export function validateReferenceAttachment(body: unknown): ReferenceAttachmentValidation {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid reference: body must be a JSON object' }
  }
  const { productId, value } = body as Record<string, unknown>

  if (typeof productId !== 'string' || !isValidUuid(productId)) {
    return { ok: false, error: 'Invalid reference: a valid productId is required' }
  }
  const trimmed = typeof value === 'string' ? value.trim() : ''
  if (!/[\p{L}\p{N}]/u.test(trimmed)) {
    return { ok: false, error: 'Invalid reference: the value needs at least one letter or digit' }
  }
  if (trimmed.length > MAX_REFERENCE_LENGTH) {
    return { ok: false, error: `Invalid reference: at most ${MAX_REFERENCE_LENGTH} characters` }
  }

  return { ok: true, value: { productId, value: trimmed } }
}
