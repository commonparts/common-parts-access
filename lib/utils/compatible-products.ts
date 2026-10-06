/**
 * Display rules for the "Compatible with" section of a part page (issue #355).
 * A part links to up to 50 products (#222), so the list is grouped by brand,
 * can be filtered, and is collapsed past a threshold. The rules are pure so
 * they can be tested without rendering the page.
 */

/**
 * Products shown before the "Show all" control. Past this count the section
 * also offers a filter field, since a visitor scanning for their own device
 * benefits from it as soon as the list is collapsed.
 */
export const COLLAPSED_COMPATIBLE_PRODUCTS_COUNT = 12

/** The minimum a product needs to be grouped, sorted and filtered. */
export interface CompatibleProductRef {
  name: string
  brand?: { name: string; slug: string } | null
  references?: readonly { value: string }[]
}

/** One brand and its compatible products. `brand` is null for products with no brand. */
export interface CompatibleProductGroup<T extends CompatibleProductRef> {
  brand: NonNullable<T['brand']> | null
  products: T[]
}

// Numeric collation so "Series 9" sorts before "Series 10"; base sensitivity
// so case and accents do not split otherwise identical names.
const nameCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })

/**
 * Reduces text to lowercase letters and digits, without accents. Applied to
 * both the query and the searched values, so "hq-8505", "HQ 8505" and
 * "HQ8505" all match the same reference.
 */
function foldSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
}

/**
 * Groups products by brand. Groups are ordered by brand name, with the
 * products that have no brand last; products are ordered by name within
 * their group. The brand is keyed on its slug, the identity used in the
 * brand page URL the group heading links to.
 */
export function groupProductsByBrand<T extends CompatibleProductRef>(
  products: readonly T[],
): CompatibleProductGroup<T>[] {
  const bySlug = new Map<string, CompatibleProductGroup<T>>()
  const unbranded: T[] = []

  for (const product of products) {
    const brand = (product.brand ?? null) as NonNullable<T['brand']> | null
    if (!brand) {
      unbranded.push(product)
      continue
    }
    const group = bySlug.get(brand.slug)
    if (group) group.products.push(product)
    else bySlug.set(brand.slug, { brand, products: [product] })
  }

  const byName = (a: T, b: T) => nameCollator.compare(a.name, b.name)
  const groups = [...bySlug.values()]
    .sort((a, b) => nameCollator.compare(a.brand?.name ?? '', b.brand?.name ?? ''))
    .map((group) => ({ ...group, products: [...group.products].sort(byName) }))

  if (unbranded.length > 0) {
    groups.push({ brand: null, products: [...unbranded].sort(byName) })
  }
  return groups
}

/**
 * Keeps the products whose name, brand name or one of whose references
 * contains the query, ignoring case, accents, spaces and punctuation.
 * References are searched because a visitor often knows their device only
 * by the model number printed on it. A query that folds to nothing keeps
 * every product.
 */
export function filterCompatibleProducts<T extends CompatibleProductRef>(
  products: readonly T[],
  query: string,
): T[] {
  const needle = foldSearchText(query)
  if (!needle) return [...products]

  return products.filter((product) =>
    [product.name, product.brand?.name ?? '', ...(product.references ?? []).map((r) => r.value)]
      .some((value) => foldSearchText(value).includes(needle)),
  )
}

/**
 * Keeps the first `limit` products across the groups, in display order, and
 * drops the groups left empty. Used for the collapsed view.
 */
export function limitProductGroups<T extends CompatibleProductRef>(
  groups: readonly CompatibleProductGroup<T>[],
  limit: number,
): CompatibleProductGroup<T>[] {
  const limited: CompatibleProductGroup<T>[] = []
  let remaining = limit

  for (const group of groups) {
    if (remaining <= 0) break
    const products = group.products.slice(0, remaining)
    limited.push({ ...group, products })
    remaining -= products.length
  }
  return limited
}
