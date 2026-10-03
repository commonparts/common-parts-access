import { createClient } from '@/lib/supabase/server'
import type { SitemapPart, SitemapProduct } from '@/lib/utils/sitemap'
import { firstEmbedded } from '@/lib/utils/supabase-embed'

/**
 * Rows per request. PostgREST caps a response at the project's max-rows
 * (1000 by default), so larger sets are read page by page.
 */
const SITEMAP_PAGE_SIZE = 1000

/**
 * Upper bound on rows read per entity. The sitemap protocol caps a file at
 * 50,000 URLs; beyond this the sitemap must be split (generateSitemaps).
 */
const SITEMAP_MAX_ROWS_PER_ENTITY = 20_000

interface SitemapProductRow {
  slug: string
  updated_at: string | null
  brands: { slug: string } | { slug: string }[] | null
  categories: { slug: string; path: string } | { slug: string; path: string }[] | null
}

/**
 * Reads every row of a paginated query, SITEMAP_PAGE_SIZE at a time, up to
 * SITEMAP_MAX_ROWS_PER_ENTITY. `fetchPage` must order on a unique column so
 * pages neither overlap nor skip rows.
 */
async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = []
  while (rows.length < SITEMAP_MAX_ROWS_PER_ENTITY) {
    const from = rows.length
    const to = Math.min(from + SITEMAP_PAGE_SIZE, SITEMAP_MAX_ROWS_PER_ENTITY) - 1
    const { data, error } = await fetchPage(from, to)
    if (error) throw error
    const page = data ?? []
    rows.push(...page)
    if (page.length < to - from + 1) break
  }
  return rows
}

/**
 * Listed products (issue #321: a published part or an open part request)
 * with the brand and category they place in navigation. Brand, brand-scoped
 * category and category URLs are derived from these rows, the same rule as
 * fetch_browse_nav / fetch_brand_nav / fetch_category_page.
 * RLS: public read policies on products, brands and categories.
 * Index: the partial index on products where is_listed covers the filter.
 */
export async function fetchSitemapProducts(): Promise<SitemapProduct[]> {
  const supabase = await createClient()
  const rows = await fetchAllPages(async (from, to) => {
    const { data, error } = await supabase
      .from('products')
      .select('slug, updated_at, brands(slug), categories(slug, path)')
      .eq('is_listed', true)
      .order('id')
      .range(from, to)
    return { data: data as unknown as SitemapProductRow[] | null, error }
  })

  return rows.map((row) => {
    const category = firstEmbedded(row.categories)
    return {
      slug: row.slug,
      updatedAt: row.updated_at,
      brandSlug: firstEmbedded(row.brands)?.slug ?? null,
      categorySlug: category?.slug ?? null,
      categoryPath: category?.path ?? null,
    }
  })
}

/**
 * Published parts. RLS: public read policy on published parts.
 */
export async function fetchSitemapParts(): Promise<SitemapPart[]> {
  const supabase = await createClient()
  const rows = await fetchAllPages<{ slug: string; updated_at: string | null }>((from, to) =>
    supabase
      .from('parts')
      .select('slug, updated_at')
      .eq('status', 'published')
      .order('id')
      .range(from, to),
  )

  return rows.map((row) => ({ slug: row.slug, updatedAt: row.updated_at }))
}
