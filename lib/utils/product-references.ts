import type { VisitorLocale } from './locale'

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
