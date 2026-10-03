import { createClient } from '@/lib/supabase/server'

// Row shapes returned by the fetch_browse_nav RPC (migration 20260716181406,
// listing rule since 20260926120000). A node is returned when it holds a
// listed product: one with a published part or an open part request. Parts
// counts are distinct published parts per node (a part fitting several
// products counts once), aggregated set-based in the RPC — never per-row
// count queries. Product counts only count products with a published part,
// so a node listed through requests alone reads zero on both.

export interface BrowseNavBrand {
  id: string
  name: string
  slug: string
  parts_count: number
  product_count: number
}

export interface BrowseNavRoot {
  id: string
  name: string
  slug: string
  /** Subtree-aggregated (path-prefix) distinct counts, not direct-product counts. */
  parts_count: number
  product_count: number
  /** Up to three example leaf names, availability first — hub tile microcopy. */
  example_leaves: string[]
}

export interface BrowseNav {
  brands: BrowseNavBrand[]
  roots: BrowseNavRoot[]
}

/**
 * Fetches the /browse hub navigation data in one round-trip: the brands and
 * the level-0 category roots that hold a listed product, with
 * subtree-aggregated counts — the entry tiles of the hierarchical drill-down
 * (issue #276). Other entities are not surfaced (issues #312, #321); their
 * pages stay reachable by direct URL. Reads are covered by the public read
 * RLS policies (the RPC is SECURITY INVOKER).
 */
export async function fetchBrowseNav(): Promise<BrowseNav> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('fetch_browse_nav')
  if (error) throw error

  const nav = data as BrowseNav | null
  return {
    brands: nav?.brands ?? [],
    roots: nav?.roots ?? [],
  }
}
