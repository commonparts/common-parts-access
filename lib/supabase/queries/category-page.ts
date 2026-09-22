import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { withPublishedParts } from '@/lib/utils/catalog'

// Row shapes returned by the fetch_category_page RPC (migration
// 20260716181406, availability semantics since 20260922120000). Parts counts
// are distinct published parts per node (a part fitting several products
// counts once), aggregated set-based in the RPC — never per-row count
// queries. Product counts only count products that carry a published part.

export interface CategoryPageCategory {
  id: string
  name: string
  slug: string
  level: number
  /** Subtree-aggregated (path-prefix) distinct counts, not direct-product counts. */
  parts_count: number
  product_count: number
}

/** Ancestor of the page's category, ordered root-first — the breadcrumb. */
export interface CategoryPageAncestor {
  name: string
  slug: string
}

export interface CategoryPageChild {
  id: string
  name: string
  slug: string
  /** Subtree-aggregated (path-prefix) distinct counts, not direct-product counts. */
  parts_count: number
  product_count: number
  /** Direct children of this child that have parts — whether it drills further. */
  children_count: number
}

/** Brand covering the category's direct products — target of /brands/[brand]/[category]. */
export interface CategoryPageBrand {
  id: string
  name: string
  slug: string
  parts_count: number
  product_count: number
}

export interface CategoryPageData {
  category: CategoryPageCategory
  ancestors: CategoryPageAncestor[]
  children: CategoryPageChild[]
  brands: CategoryPageBrand[]
}

/**
 * Loads everything one /categories/[slug] page needs in a single round-trip
 * via the fetch_category_page RPC: the category with subtree totals, the
 * ancestor chain from the materialized path, the direct children and the
 * covering brands that have at least one published part (issue #312 — the
 * page's own category is returned even at zero so its URL keeps rendering).
 * Returns null for an unknown slug (the route 404s). Wrapped in React
 * cache() so generateMetadata and the page component share a single query
 * per request. The RPC is SECURITY INVOKER; reads are covered by the public
 * read policies.
 */
export const fetchCategoryPage = cache(
  async (slug: string): Promise<CategoryPageData | null> => {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('fetch_category_page', { p_slug: slug })
    if (error) throw error

    const page = data as CategoryPageData | null
    if (!page) return null
    return {
      ...page,
      children: withPublishedParts(page.children),
      brands: withPublishedParts(page.brands),
    }
  },
)
