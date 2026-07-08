import { createClient } from '@/lib/supabase/server'
import {
  emptySearchResults,
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_LIMIT,
  SEARCH_MAX_QUERY_LENGTH,
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
 * @param query    Raw user query; whitespace-only yields an empty payload and
 *                 it is truncated to SEARCH_MAX_QUERY_LENGTH before the DB call.
 * @param limit    Max results per group; clamped to [1, SEARCH_MAX_LIMIT].
 */
export async function searchAll(query: string, limit: number = SEARCH_DEFAULT_LIMIT): Promise<SearchResults> {
  const trimmed = (query?.trim() ?? '').slice(0, SEARCH_MAX_QUERY_LENGTH)
  if (!trimmed) {
    return emptySearchResults()
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

export interface BrandSuggestion {
  name: string
  slug: string
}

/**
 * Conservative empty-state suggestion: returns a brand only when the whole
 * query or one of its tokens is an EXACT (case-insensitive) match for a brand
 * name — never a fuzzy/partial match. Used on the /search zero-result state to
 * point at a real brand page (e.g. query "magimix blender" → the Magimix brand).
 * Tokens are sanitized to [a-z0-9-] before building the filter.
 */
export async function findExactBrandMatch(query: string): Promise<BrandSuggestion | null> {
  const tokens = Array.from(
    new Set(
      [query, ...query.split(/\s+/)]
        .map((t) => t.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))
        .filter((t) => t.length >= 2),
    ),
  )
  if (tokens.length === 0) return null

  const supabase = await createClient()
  // `name.ilike.<token>` with no wildcards is a case-insensitive exact match.
  const orFilter = tokens.map((t) => `name.ilike.${t}`).join(',')
  const { data, error } = await supabase
    .from('brands')
    .select('name, slug')
    .or(orFilter)
    .limit(1)

  if (error) {
    console.error('findExactBrandMatch: query failed', error)
    return null
  }

  return (data?.[0] as BrandSuggestion | undefined) ?? null
}
