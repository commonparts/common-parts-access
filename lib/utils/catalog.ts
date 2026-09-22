/** Any navigation row carrying a distinct published-parts count. */
export interface WithPartsCount {
  parts_count: number
}

/**
 * Keeps only the rows that have at least one published part. The navigation
 * RPCs already exclude such rows since migration 20260922120000 (issue #312);
 * this guard makes a deployment that runs ahead of that migration hide them
 * too, so a stale function can never bring the empty entries back.
 */
export function withPublishedParts<T extends WithPartsCount>(rows: T[]): T[] {
  return rows.filter((row) => row.parts_count > 0)
}

/** The minimum a brand row needs to be deduplicated and ordered. */
export interface BrandRef {
  name: string
  slug: string
}

/**
 * The distinct brands of a part's compatible products, ordered by name
 * (issue #315).
 *
 * A part carries no brand of its own: it is filed under every brand whose
 * products it fits, and a part usually fits several products of the same
 * brand — so the list arrives with duplicates and in join order. Both the
 * part card and the part detail payload derive their brands this way, which
 * is why the rule lives here rather than in either of them: the two must
 * never disagree about which brands a part belongs to.
 *
 * Deduplication is keyed on the slug (the brand's identity in every URL the
 * result links to) and keeps the first occurrence. Nullish entries — a
 * product with no brand, or an embed that came back empty — are dropped.
 */
export function distinctBrands<T extends BrandRef>(
  brands: readonly (T | null | undefined)[],
): T[] {
  const bySlug = new Map<string, T>()

  for (const brand of brands) {
    if (brand && !bySlug.has(brand.slug)) bySlug.set(brand.slug, brand)
  }

  return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name))
}
