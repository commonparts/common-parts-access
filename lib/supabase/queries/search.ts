import type { Locale } from 'next-intl'
import { createClient } from '@/lib/supabase/server'
import { resolveStorageUrl } from '@/lib/storage/url'
import {
  emptySearchResults,
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_LIMIT,
  SEARCH_MAX_QUERY_LENGTH,
  type SearchResults,
} from '@/types/search'

/**
 * Runs a multi-entity search (products, parts, brands) via the public.search_all
 * RPC and returns grouped, ranked results.
 *
 * All matching, ranking, per-group bounding and the published-only filter happen
 * inside the RPC (single round-trip, sub-150 ms target). This wrapper only
 * normalizes the inputs and guards the empty-query case so we never hit the
 * database for a blank term.
 *
 * @param query    Raw user query; whitespace-only yields an empty payload and
 *                 it is truncated to SEARCH_MAX_QUERY_LENGTH before the DB call.
 * @param locale   Language of the product categories returned (#502).
 * @param limit    Max results per group; clamped to [1, SEARCH_MAX_LIMIT].
 */
export async function searchAll(
  query: string,
  locale: Locale,
  limit: number = SEARCH_DEFAULT_LIMIT,
): Promise<SearchResults> {
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
    p_locale: locale,
  })

  if (error) {
    console.error('searchAll: RPC failed', error)
    throw error
  }

  // The RPC always returns a jsonb object with the three keys; fall back
  // defensively so callers never have to null-check the groups.
  // Cast: search_all returns jsonb, which the generated types can only call
  // `Json`; its shape is the RPC's contract, described by SearchResults.
  const results = (data ?? {}) as Partial<SearchResults>
  // The RPC returns stored storage references; they resolve to public URLs
  // here, before any caller renders them (#56).
  return {
    products: (results.products ?? []).map((product) => ({
      ...product,
      image_url: resolveStorageUrl(product.image_url),
    })),
    parts: (results.parts ?? []).map((part) => ({
      ...part,
      thumbnail_url: resolveStorageUrl(part.thumbnail_url),
    })),
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
 * name — never a fuzzy/partial match — and only when the brand holds a
 * listed product, the same visibility rule as search_all (issues #312,
 * #321): the zero-result state must not point at an empty brand page.
 * Used on /search (e.g. query "magimix blender" → the Magimix brand). Tokens
 * are sanitized to [a-z0-9-] before building the filter.
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
  // `products!inner` with a filter on the embedded rows keeps only brands
  // that have a matching product (an EXISTS in PostgREST terms); the embed is
  // bounded to one row so the payload never grows with the brand's catalog.
  const { data, error } = await supabase
    .from('brands')
    .select('name, slug, products!inner(id)')
    .or(orFilter)
    .eq('products.is_listed', true)
    .limit(1, { referencedTable: 'products' })
    .limit(1)

  if (error) {
    console.error('findExactBrandMatch: query failed', error)
    return null
  }

  const match = data?.[0]
  return match ? { name: match.name, slug: match.slug } : null
}
