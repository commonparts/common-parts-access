import { createClient } from '@/lib/supabase/server'
import {
  EMPTY_SEARCH_RESULTS,
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_LIMIT,
  type SearchResults,
} from '@/types/search'

/**
 * Runs a multi-entity search (products, models, brands) via the public.search_all
 * RPC and returns grouped, ranked results.
 *
 * All matching, ranking, per-group bounding and the published-only filter happen
 * inside the RPC (single round-trip, sub-150 ms target). This wrapper only
 * normalizes the inputs and guards the empty-query case so we never hit the
 * database for a blank term.
 *
 * @param query    Raw user query; whitespace-only yields an empty payload.
 * @param limit    Max results per group; clamped to [1, SEARCH_MAX_LIMIT].
 */
export async function searchAll(query: string, limit: number = SEARCH_DEFAULT_LIMIT): Promise<SearchResults> {
  const trimmed = query?.trim() ?? ''
  if (!trimmed) {
    return EMPTY_SEARCH_RESULTS
  }

  const safeLimit = Number.isFinite(limit)
    ? Math.min(Math.max(Math.trunc(limit), 1), SEARCH_MAX_LIMIT)
    : SEARCH_DEFAULT_LIMIT

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('search_all', {
    search_query: trimmed,
    result_limit: safeLimit,
  })

  if (error) {
    console.error('searchAll: RPC failed', error)
    throw error
  }

  // The RPC always returns a jsonb object with the three keys; fall back
  // defensively so callers never have to null-check the groups.
  const results = (data ?? {}) as Partial<SearchResults>
  return {
    products: results.products ?? [],
    models: results.models ?? [],
    brands: results.brands ?? [],
  }
}
