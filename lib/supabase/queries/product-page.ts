import { createClient } from '@/lib/supabase/server'
import type { ProductKind } from '@/types/database'

// A commercial series stays well under this; bounds every variant/parts query.
const MAX_VARIANTS = 100
const MAX_PART_LINKS = 500

// Supabase embeds a to-one relation as an object, but the generated-less client
// types it as a possibly-array — normalize to the first row (or null).
function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export interface ProductRef {
  id: string
  name: string
  slug: string
  model_number: string | null
}

export interface ProductPageProduct {
  id: string
  name: string
  slug: string
  model_number: string | null
  release_year: number | null
  discontinued: boolean
  image_url: string | null
  product_kind: ProductKind
  parent_id: string | null
  brand: { id: string; name: string; slug: string } | null
  category: { id: string; name: string; slug: string } | null
}

export interface ProductPageData {
  product: ProductPageProduct
  // The parent family for a variant (null for standalone/family pages).
  family: ProductRef | null
  // Sibling references (a variant's family members) or, on a family page, the
  // family's variants. Always excludes the product itself.
  siblings: ProductRef[]
}

export interface ProductPart {
  id: string
  name: string
  slug: string
  thumbnail_url: string | null
  part_name: string | null
  part_number: string | null
  material: string | null
  download_count: number
  estimated_print_time: number | null // minutes
  created_at: string | null
  author_username: string | null
  license_short_name: string | null
  // True when a link to THIS exact reference is marked verified — drives the
  // "Verified on {reference}" badge (vs the declared "Fits {family}" badge).
  verified_here: boolean
  // Every product (this reference / family / siblings) the part is linked to.
  product_ids: string[]
}

interface ProductRow {
  id: string
  name: string
  slug: string
  model_number: string | null
  release_year: number | null
  discontinued: boolean | null
  image_url: string | null
  product_kind: ProductKind | null
  parent_id: string | null
  brands: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null
  categories: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null
}

/**
 * Loads a product page by slug: the product with its brand + category, the
 * parent family (for a variant), and sibling references. Returns null when the
 * slug does not resolve. Covered by the public read policy on products.
 */
export async function fetchProductPageBySlug(slug: string): Promise<ProductPageData | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(
      `
      id, name, slug, model_number, release_year, discontinued, image_url, parent_id, product_kind,
      brands(id, name, slug),
      categories(id, name, slug)
    `,
    )
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const row = data as ProductRow
  const product: ProductPageProduct = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    model_number: row.model_number,
    release_year: row.release_year,
    discontinued: Boolean(row.discontinued),
    image_url: row.image_url,
    product_kind: row.product_kind ?? 'standalone',
    parent_id: row.parent_id,
    brand: firstOf(row.brands),
    category: firstOf(row.categories),
  }

  const family = product.parent_id ? await fetchProductRef(product.parent_id) : null

  // Siblings: on a family page, the family's variants; on a variant page, the
  // other members of the same family.
  const siblingParentId = product.product_kind === 'family' ? product.id : product.parent_id
  const siblings = siblingParentId
    ? await fetchSiblings(siblingParentId, product.id)
    : []

  return { product, family, siblings }
}

async function fetchProductRef(id: string): Promise<ProductRef | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, model_number')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as ProductRef | null) ?? null
}

async function fetchSiblings(parentId: string, excludeId: string): Promise<ProductRef[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, model_number')
    .eq('parent_id', parentId)
    .neq('id', excludeId)
    .order('model_number', { ascending: true })
    .limit(MAX_VARIANTS)
  if (error) throw error
  return (data ?? []) as ProductRef[]
}

interface ModelRow {
  id: string
  name: string
  slug: string
  thumbnail_url: string | null
  part_name: string | null
  part_number: string | null
  material: string | null
  download_count: number | null
  estimated_print_time: number | null
  created_at: string | null
  user_profiles: { username: string } | { username: string }[] | null
  licenses: { short_name: string } | { short_name: string }[] | null
}

interface PartLinkRow {
  product_id: string
  compatibility_status: 'declared' | 'verified'
  models: ModelRow | ModelRow[] | null
}

/**
 * Fetches the published parts shown on a product page, deduplicated per model.
 * A variant inherits its parent family's parts; a family page aggregates its
 * variants' parts. `verified_here` is true only when a link to THIS reference is
 * verified — so the same part reads "Verified on HC9450/15" on that page and
 * "Fits {family}" on a sibling. Sorting/ranking is left to the caller.
 */
export async function fetchProductPageParts(input: {
  productId: string
  parentId: string | null
  productKind: ProductKind
}): Promise<ProductPart[]> {
  const supabase = await createClient()

  const relevantIds = [input.productId]
  if (input.productKind === 'variant' && input.parentId) {
    relevantIds.push(input.parentId)
  }
  if (input.productKind === 'family') {
    const { data: variants, error: variantsError } = await supabase
      .from('products')
      .select('id')
      .eq('parent_id', input.productId)
      .limit(MAX_VARIANTS)
    if (variantsError) throw variantsError
    relevantIds.push(...(variants ?? []).map((v) => v.id))
  }

  const { data, error } = await supabase
    .from('model_products')
    .select(
      `
      product_id,
      compatibility_status,
      models!inner(
        id, name, slug, thumbnail_url, part_name, part_number, material,
        download_count, estimated_print_time, created_at, status,
        user_profiles(username),
        licenses!models_license_id_fkey(short_name)
      )
    `,
    )
    .in('product_id', relevantIds)
    .eq('models.status', 'published')
    .limit(MAX_PART_LINKS)

  if (error) throw error

  const byModel = new Map<string, ProductPart>()

  for (const link of (data ?? []) as PartLinkRow[]) {
    const model = firstOf(link.models)
    if (!model) continue

    const verifiedHere =
      link.product_id === input.productId && link.compatibility_status === 'verified'

    const existing = byModel.get(model.id)
    if (existing) {
      existing.product_ids.push(link.product_id)
      if (verifiedHere) existing.verified_here = true
      continue
    }

    byModel.set(model.id, {
      id: model.id,
      name: model.name,
      slug: model.slug,
      thumbnail_url: model.thumbnail_url,
      part_name: model.part_name,
      part_number: model.part_number,
      material: model.material,
      download_count: model.download_count ?? 0,
      estimated_print_time: model.estimated_print_time,
      created_at: model.created_at,
      author_username: firstOf(model.user_profiles)?.username ?? null,
      license_short_name: firstOf(model.licenses)?.short_name ?? null,
      verified_here: verifiedHere,
      product_ids: [link.product_id],
    })
  }

  return Array.from(byModel.values())
}
