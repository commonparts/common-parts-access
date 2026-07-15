import { createClient } from '@/lib/supabase/server'

// Row shapes returned by the fetch_browse_nav RPC (migration 20260715090000).
// Counts are the denormalized products.parts_count sums — never live counts.

export interface BrowseNavBrand {
  id: string
  name: string
  slug: string
  parts_count: number
  product_count: number
}

export interface BrowseNavCategory {
  id: string
  name: string
  slug: string
  parts_count: number
  /** Brands covering this category — targets of /brands/[brand]/[category]. */
  brands: BrowseNavBrand[]
}

export interface BrowseNav {
  brands: BrowseNavBrand[]
  categories: BrowseNavCategory[]
}

/**
 * Fetches the /browse hub navigation data in one round-trip: all indexed
 * brands (including zero-part brands, whose pages are kept alive per Flow P2)
 * and the category×brand entries with summed parts counts. Reads are covered
 * by the public read RLS policies (the RPC is SECURITY INVOKER).
 */
export async function fetchBrowseNav(): Promise<BrowseNav> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('fetch_browse_nav')
  if (error) throw error

  const nav = data as BrowseNav | null
  return {
    brands: nav?.brands ?? [],
    categories: nav?.categories ?? [],
  }
}
