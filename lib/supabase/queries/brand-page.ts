import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// Upper bound on products fetched for a brand page in one call. The covered
// categories are derived from this same result set, so the bound also caps
// that aggregation.
const MAX_BRAND_PRODUCTS = 200

/** Page size of the brand-scoped category listing (/brands/[brand]/[category]). */
export const BRAND_CATEGORY_PAGE_SIZE = 24

// Supabase embeds a to-one relation as an object, but the generated-less client
// types it as a possibly-array — normalize to the first row (or null).
function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export interface BrandPageBrand {
  id: string
  name: string
  slug: string
  description: string | null
}

export interface BrandPageProduct {
  id: string
  name: string
  slug: string
  image_url: string | null
  parts_count: number
  category: { id: string; name: string; slug: string } | null
}

export interface BrandCoveredCategory {
  id: string
  name: string
  slug: string
  parts_count: number
  product_count: number
}

interface ProductRow {
  id: string
  name: string
  slug: string
  image_url: string | null
  parts_count: number | null
  categories: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null
}

/**
 * Loads a brand by slug for the /brands/[brand] page. Returns null when the
 * slug is not in the index (the route 404s). Wrapped in React cache() so
 * generateMetadata and the page component share a single query per request.
 * Covered by the public read policy on brands.
 */
export const fetchBrandBySlug = cache(async (slug: string): Promise<BrandPageBrand | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('brands')
    .select('id, name, slug, description')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw error
  return (data as BrandPageBrand | null) ?? null
})

/**
 * Fetches the products of a brand with their category and denormalized
 * parts_count, ordered by name. Serves both the brand page's product list and
 * (via deriveCoveredCategories) its covered-categories navigation. Wrapped in
 * React cache() so generateMetadata and the page component share a single
 * query per request. Covered by the public read policies on products and
 * categories.
 */
export const fetchBrandProducts = cache(async (brandId: string): Promise<BrandPageProduct[]> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, image_url, parts_count, categories(id, name, slug)')
    .eq('brand_id', brandId)
    .order('name', { ascending: true })
    .limit(MAX_BRAND_PRODUCTS)

  if (error) throw error

  return ((data ?? []) as ProductRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    image_url: row.image_url,
    parts_count: row.parts_count ?? 0,
    category: firstOf(row.categories),
  }))
})

/**
 * Derives the categories covered by a brand from its product list: distinct
 * categories with summed parts counts, ordered by name. Pure aggregation over
 * an already-bounded result set — no extra query.
 */
export function deriveCoveredCategories(products: BrandPageProduct[]): BrandCoveredCategory[] {
  const byCategory = new Map<string, BrandCoveredCategory>()

  for (const product of products) {
    if (!product.category) continue
    const existing = byCategory.get(product.category.id)
    if (existing) {
      existing.parts_count += product.parts_count
      existing.product_count += 1
    } else {
      byCategory.set(product.category.id, {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
        parts_count: product.parts_count,
        product_count: 1,
      })
    }
  }

  return Array.from(byCategory.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export interface BrandCategoryListing {
  category: { id: string; name: string; slug: string }
  products: BrandPageProduct[]
  total: number
  page: number
  totalPages: number
}

/**
 * Loads the /brands/[brand]/[category] listing: the category by slug plus the
 * brand's products in that category, paginated. Returns null when the category
 * slug does not resolve (the route 404s); an empty products array with a valid
 * category renders the empty state instead. Covered by the public read
 * policies on categories and products.
 */
export async function fetchBrandCategoryListing(input: {
  brandId: string
  categorySlug: string
  page: number
}): Promise<BrandCategoryListing | null> {
  const supabase = await createClient()

  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('slug', input.categorySlug)
    .maybeSingle()

  if (categoryError) throw categoryError
  if (!category) return null

  const page = Math.max(1, input.page)
  const from = (page - 1) * BRAND_CATEGORY_PAGE_SIZE
  const to = from + BRAND_CATEGORY_PAGE_SIZE - 1

  const { data, error, count } = await supabase
    .from('products')
    .select('id, name, slug, image_url, parts_count', { count: 'exact' })
    .eq('brand_id', input.brandId)
    .eq('category_id', category.id)
    .order('name', { ascending: true })
    .range(from, to)

  if (error) throw error

  const total = count ?? 0
  return {
    category,
    products: ((data ?? []) as Omit<ProductRow, 'categories'>[]).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      image_url: row.image_url,
      parts_count: row.parts_count ?? 0,
      category,
    })),
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / BRAND_CATEGORY_PAGE_SIZE)),
  }
}
