import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/** Page size shared by the /brands/[brand] and /brands/[brand]/[category] listings. */
export const NAV_LISTING_PAGE_SIZE = 24

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

export interface BrandNav {
  parts_count: number
  product_count: number
  categories: BrandCoveredCategory[]
}

export interface ProductListingPage<T> {
  products: T[]
  total: number
  page: number
  totalPages: number
}

// Supabase embeds a to-one relation as an object, but the generated-less client
// types it as a possibly-array — normalize to the first row (or null).
function firstOf<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

/** Clamps a 1-based page and returns the PostgREST range bounds for it. */
function pageRange(page: number): { page: number; from: number; to: number } {
  const clamped = Math.max(1, page)
  const from = (clamped - 1) * NAV_LISTING_PAGE_SIZE
  return { page: clamped, from, to: from + NAV_LISTING_PAGE_SIZE - 1 }
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
 * Fetches a brand's accurate totals and covered categories via the
 * fetch_brand_nav RPC (migration 20260715090000) — aggregated in the
 * database so the counts are never derived from a truncated product list.
 * Wrapped in React cache() so generateMetadata and the page component share
 * a single query per request. The RPC is SECURITY INVOKER; reads are covered
 * by the public read policies.
 */
export const fetchBrandNav = cache(async (brandId: string): Promise<BrandNav> => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('fetch_brand_nav', { p_brand_id: brandId })
  if (error) throw error

  const nav = data as BrandNav | null
  return {
    parts_count: nav?.parts_count ?? 0,
    product_count: nav?.product_count ?? 0,
    categories: nav?.categories ?? [],
  }
})

interface ProductRow {
  id: string
  name: string
  slug: string
  image_url: string | null
  parts_count: number | null
  categories: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null
}

/**
 * Fetches one page of a brand's products with their category and denormalized
 * parts_count, ordered by name. Wrapped in React cache() (primitive args so
 * the per-request key works) in case a future caller shares it with metadata.
 * Covered by the public read policies on products and categories.
 */
export const fetchBrandProductsPage = cache(
  async (brandId: string, rawPage: number): Promise<ProductListingPage<BrandPageProduct>> => {
    const supabase = await createClient()
    const { page, from, to } = pageRange(rawPage)

    const { data, error, count } = await supabase
      .from('products')
      .select('id, name, slug, image_url, parts_count, categories(id, name, slug)', {
        count: 'exact',
      })
      .eq('brand_id', brandId)
      .order('name', { ascending: true })
      .range(from, to)

    if (error) throw error

    const total = count ?? 0
    return {
      products: ((data ?? []) as ProductRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        image_url: row.image_url,
        parts_count: row.parts_count ?? 0,
        category: firstOf(row.categories),
      })),
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / NAV_LISTING_PAGE_SIZE)),
    }
  },
)

export interface BrandCategoryListing extends ProductListingPage<BrandPageProduct> {
  category: { id: string; name: string; slug: string }
}

/**
 * Loads the /brands/[brand]/[category] listing: the category by slug plus the
 * brand's products in that category, paginated. Returns null when the category
 * slug does not resolve (the route 404s); an empty products array with a valid
 * category renders the empty state instead. Wrapped in React cache() with
 * primitive args so generateMetadata and the page component share the two
 * queries per request. Covered by the public read policies on categories and
 * products.
 */
export const fetchBrandCategoryListing = cache(
  async (
    brandId: string,
    categorySlug: string,
    rawPage: number,
  ): Promise<BrandCategoryListing | null> => {
    const supabase = await createClient()

    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, name, slug')
      .eq('slug', categorySlug)
      .maybeSingle()

    if (categoryError) throw categoryError
    if (!category) return null

    const { page, from, to } = pageRange(rawPage)

    const { data, error, count } = await supabase
      .from('products')
      .select('id, name, slug, image_url, parts_count', { count: 'exact' })
      .eq('brand_id', brandId)
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
      totalPages: Math.max(1, Math.ceil(total / NAV_LISTING_PAGE_SIZE)),
    }
  },
)
