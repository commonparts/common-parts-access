import { createClient } from '@/lib/supabase/server'
import type { CompatibilityStatus, Model, Product } from '@/types/database'

// Family-aware selects require the columns added by the product-families
// migration (20260708075018); the legacy list keeps pre-existing queries
// working even if code ships before that migration runs.
const PRODUCT_SELECT = 'id, name, slug, brand_id, category_id, model_number'
const PRODUCT_FAMILY_SELECT = `${PRODUCT_SELECT}, parent_id, product_kind`

// Families are curated manually; a commercial series stays well under this.
const MAX_FAMILY_VARIANTS = 100
// Upper bound on part links fetched for a family page in one call.
const MAX_FAMILY_PART_LINKS = 500

export interface FetchProductsParams {
  brandId?: string
  categoryId?: string
  includeDescendants?: boolean
  search?: string
  limit?: number
}

export interface CreateProductInput {
  name: string
  brandId: string
  categoryId: string
  modelNumber?: string
  description?: string
  releaseYear?: number | null
  imageUrl?: string
  discontinued?: boolean
}

export async function fetchProducts(params: FetchProductsParams = {}): Promise<Product[]> {
  const supabase = await createClient()
  const limit = params.limit && params.limit > 0 ? params.limit : 100

  const resolveCategoryIds = async (): Promise<string[] | undefined> => {
    if (!params.categoryId) return undefined
    if (!params.includeDescendants) return [params.categoryId]

    const { data: targetCategory, error: targetError } = await supabase
      .from('categories')
      .select('id, path')
      .eq('id', params.categoryId)
      .single()

    if (targetError) {
      console.error('fetchProducts: failed to resolve category path', targetError)
      return [params.categoryId]
    }

    if (targetCategory?.path) {
      const { data: descendants, error: descError } = await supabase
        .from('categories')
        .select('id')
        .ilike('path', `${targetCategory.path}%`)

      if (descError) {
        console.error('fetchProducts: failed to fetch descendant categories', descError)
        return [params.categoryId]
      }

      const ids = (descendants ?? []).map((c) => c.id)
      return ids.length ? ids : [params.categoryId]
    }

    return [params.categoryId]
  }

  const categoryIds = await resolveCategoryIds()

  let query = supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .order('name', { ascending: true })
    .limit(limit)

  if (params.brandId) {
    query = query.eq('brand_id', params.brandId)
  }

  if (categoryIds && categoryIds.length > 0) {
    query = query.in('category_id', categoryIds)
  }

  if (params.search && params.search.trim()) {
    query = query.ilike('name', `%${params.search.trim()}%`)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []) as Product[]
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const supabase = await createClient()

  const name = input.name?.trim()
  if (!name) {
    throw new Error('Name is required')
  }

  if (!input.brandId) {
    throw new Error('Brand is required')
  }

  if (!input.categoryId) {
    throw new Error('Category is required')
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      name,
      brand_id: input.brandId,
      category_id: input.categoryId,
      model_number: input.modelNumber?.trim() || null,
      description: input.description?.trim() || null,
      release_year: input.releaseYear ?? null,
      image_url: input.imageUrl?.trim() || null,
      discontinued: Boolean(input.discontinued),
    })
    .select(PRODUCT_SELECT)
    .single()

  if (error) {
    console.error('createProduct: insert failed', error)
    throw new Error(error.message || 'Failed to create product')
  }

  return data as Product
}

export interface ProductWithVariants extends Product {
  variants: Product[]
}

// A model (part) usable across a family, deduplicated across the references
// it is linked to within that family.
export interface FamilyPart {
  model: Pick<
    Model,
    'id' | 'name' | 'slug' | 'thumbnail_url' | 'part_name' | 'part_number' | 'download_count' | 'like_count' | 'status'
  >
  // 'verified' if any link within the family is verified
  compatibility_status: CompatibilityStatus
  // Products within the family (the family itself or its variants) the part is linked to
  product_ids: string[]
}

/**
 * Fetches a product together with its child variants (empty array for
 * standalone products and variants). Returns null when the product does
 * not exist. Covered by the public read policy on products.
 */
export async function fetchProductWithVariants(productId: string): Promise<ProductWithVariants | null> {
  const supabase = await createClient()

  const { data: product, error } = await supabase
    .from('products')
    .select(PRODUCT_FAMILY_SELECT)
    .eq('id', productId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!product) {
    return null
  }

  const { data: variants, error: variantsError } = await supabase
    .from('products')
    .select(PRODUCT_FAMILY_SELECT)
    .eq('parent_id', productId)
    .order('name', { ascending: true })
    .limit(MAX_FAMILY_VARIANTS)

  if (variantsError) {
    throw variantsError
  }

  return { ...(product as Product), variants: (variants ?? []) as Product[] }
}

/**
 * Fetches all parts (models) compatible with a family: models linked to the
 * family itself or to any of its variants. Results are deduplicated per
 * model — a part linked to several references appears once, with 'verified'
 * status if any of its links is verified, and product_ids listing which
 * references it is linked through. The model_products "Public or owner read"
 * RLS policy restricts rows to published models (or the caller's own).
 */
export async function fetchFamilyParts(familyId: string): Promise<FamilyPart[]> {
  const supabase = await createClient()

  const { data: variants, error: variantsError } = await supabase
    .from('products')
    .select('id')
    .eq('parent_id', familyId)
    .limit(MAX_FAMILY_VARIANTS)

  if (variantsError) {
    throw variantsError
  }

  const productIds = [familyId, ...(variants ?? []).map((v) => v.id)]

  const { data, error } = await supabase
    .from('model_products')
    .select(
      `
      product_id,
      compatibility_status,
      models(
        id,
        name,
        slug,
        thumbnail_url,
        part_name,
        part_number,
        download_count,
        like_count,
        status
      )
    `
    )
    .in('product_id', productIds)
    .limit(MAX_FAMILY_PART_LINKS)

  if (error) {
    throw error
  }

  const byModel = new Map<string, FamilyPart>()

  for (const row of data ?? []) {
    const model = (Array.isArray(row.models) ? row.models[0] : row.models) as FamilyPart['model'] | null
    if (!model) continue

    const existing = byModel.get(model.id)
    if (existing) {
      existing.product_ids.push(row.product_id)
      if (row.compatibility_status === 'verified') {
        existing.compatibility_status = 'verified'
      }
    } else {
      byModel.set(model.id, {
        model,
        compatibility_status: row.compatibility_status as CompatibilityStatus,
        product_ids: [row.product_id],
      })
    }
  }

  return Array.from(byModel.values()).sort((a, b) => a.model.name.localeCompare(b.model.name))
}
