import { createClient } from '@/lib/supabase/server'

// Upper bound on part links fetched for a product page in one call.
const MAX_PART_LINKS = 500

// Supabase embeds a to-one relation as an object, but the generated-less client
// types it as a possibly-array — normalize to the first row (or null).
function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export interface ProductPageProduct {
  id: string
  name: string
  slug: string
  release_year: number | null
  discontinued: boolean
  image_url: string | null
  brand: { id: string; name: string; slug: string } | null
  category: { id: string; name: string; slug: string } | null
}

export interface ProductPageData {
  product: ProductPageProduct
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
}

interface ProductRow {
  id: string
  name: string
  slug: string
  release_year: number | null
  discontinued: boolean | null
  image_url: string | null
  brands: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null
  categories: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null
}

/**
 * Loads a product page by slug: the product with its brand + category. Returns
 * null when the slug does not resolve. Covered by the public read policy on
 * products.
 */
export async function fetchProductPageBySlug(slug: string): Promise<ProductPageData | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select(
      `
      id, name, slug, release_year, discontinued, image_url,
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
    release_year: row.release_year,
    discontinued: Boolean(row.discontinued),
    image_url: row.image_url,
    brand: firstOf(row.brands),
    category: firstOf(row.categories),
  }

  return { product }
}

/**
 * Minimal lookup for metadata: just the product name by slug, so
 * generateMetadata doesn't re-run the full product load.
 */
export async function fetchProductNameBySlug(slug: string): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('name')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  return (data?.name as string | undefined) ?? null
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
  models: ModelRow | ModelRow[] | null
}

/**
 * Fetches the published parts shown on a product page, deduplicated per model.
 * The model_products "Public or owner read" RLS policy restricts rows to
 * published models (or the caller's own). Sorting/ranking is left to the caller.
 */
export async function fetchProductPageParts(input: { productId: string }): Promise<ProductPart[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('model_products')
    .select(
      `
      product_id,
      models!inner(
        id, name, slug, thumbnail_url, part_name, part_number, material,
        download_count, estimated_print_time, created_at, status,
        user_profiles(username),
        licenses!models_license_id_fkey(short_name)
      )
    `,
    )
    .eq('product_id', input.productId)
    .eq('models.status', 'published')
    .limit(MAX_PART_LINKS)

  if (error) throw error

  const byModel = new Map<string, ProductPart>()

  for (const link of (data ?? []) as PartLinkRow[]) {
    const model = firstOf(link.models)
    if (!model) continue
    if (byModel.has(model.id)) continue

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
    })
  }

  return Array.from(byModel.values())
}
