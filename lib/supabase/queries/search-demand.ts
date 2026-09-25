import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { inferReferenceType, type ReferenceAttachment } from '@/lib/utils/product-references'
import type { VisitorLocale } from '@/lib/utils/locale'
import {
  PRODUCT_CANDIDATES_LIMIT,
  SEARCH_MAX_QUERY_LENGTH,
  type ProductCandidate,
} from '@/types/search'

// Postgres error codes the attachment insert maps to a client error.
const FOREIGN_KEY_VIOLATION = '23503'
const CHECK_VIOLATION = '23514'

export type AttachReferenceResult = 'created' | 'unknown_product' | 'invalid_value'

/**
 * Records a zero-result search (issue #320). The caller is the /search page,
 * after search_all returned nothing, so only submitted searches are logged,
 * never autocomplete keystrokes. Uses the service role: `search_misses` has
 * RLS on, no policy and no client privileges, so the page is the single way
 * in. Nothing identifying is stored — no IP, user or session id.
 *
 * Never throws: losing one miss must not break the results page.
 */
export async function logSearchMiss(query: string, locale: string | null): Promise<void> {
  const rawQuery = query.trim().slice(0, SEARCH_MAX_QUERY_LENGTH).trim()
  // A query without a letter or digit normalizes to nothing (see the table's
  // CHECK constraint) and cannot be grouped with anything.
  if (!/[\p{L}\p{N}]/u.test(rawQuery)) return

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from('search_misses').insert({ raw_query: rawQuery, locale })
    if (error) console.error('logSearchMiss: insert failed', error)
  } catch (error) {
    console.error('logSearchMiss: failed', error)
  }
}

/**
 * Products whose brand and name match a query, across the whole catalog, for
 * the zero-result picker. Public RPC over publicly readable tables.
 */
export async function searchProductCandidates(
  query: string,
  limit: number = PRODUCT_CANDIDATES_LIMIT,
): Promise<ProductCandidate[]> {
  const trimmed = query.trim().slice(0, SEARCH_MAX_QUERY_LENGTH)
  if (!trimmed) return []

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('search_product_candidates', {
    search_query: trimmed,
    result_limit: limit,
  })
  if (error) {
    console.error('searchProductCandidates: RPC failed', error)
    throw error
  }
  return (data ?? []) as ProductCandidate[]
}

/**
 * Stores a visitor's "this reference belongs to that product" answer as a
 * pending reference (`source = 'search'`). It stays invisible — the public
 * read policy only exposes validated references, which search_all relies on —
 * until someone sets it to validated in the Supabase dashboard.
 *
 * Uses the service role: there is no INSERT policy on product_references, so
 * visitors cannot write validated rows or pick their own status and source.
 * No user identifier is stored. The visitor's region and language are kept
 * as a hint for whoever validates it. A value the product already has (under
 * the same inferred type) is ignored rather than duplicated.
 */
export async function attachProductReference(
  attachment: ReferenceAttachment,
  locale: VisitorLocale,
): Promise<AttachReferenceResult> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('product_references').upsert(
    {
      product_id: attachment.productId,
      value: attachment.value,
      type: inferReferenceType(attachment.value),
      region: locale.region,
      language: locale.language,
      source: 'search',
      status: 'pending',
    },
    { onConflict: 'product_id,normalized_value,type', ignoreDuplicates: true },
  )

  if (!error) return 'created'
  if (error.code === FOREIGN_KEY_VIOLATION) return 'unknown_product'
  if (error.code === CHECK_VIOLATION) return 'invalid_value'
  console.error('attachProductReference: insert failed', error)
  throw error
}

/** One group of zero-result searches on the demand dashboard. */
export interface SearchMissSummary {
  normalized_query: string
  /** The latest spelling of the group. */
  raw_query: string
  miss_count: number
  last_seen: string
}

/** A reference suggested from a zero-result search, awaiting validation. */
export interface PendingProductReference {
  id: string
  value: string
  type: string
  region: string | null
  language: string | null
  created_at: string
  product_name: string
  product_slug: string
  brand_name: string | null
}

/**
 * Most frequent zero-result searches of the last `sinceDays` days. The RPC is
 * executable by signed-in users only (security definer, as search_misses has
 * no read policy) and returns aggregates, never individual rows.
 */
export async function fetchTopSearchMisses(sinceDays: number, limit: number): Promise<SearchMissSummary[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('fetch_top_search_misses', {
    since_days: sinceDays,
    result_limit: limit,
  })
  if (error) {
    console.error('fetchTopSearchMisses: RPC failed', error)
    throw error
  }
  return (data ?? []) as SearchMissSummary[]
}

/**
 * The validation queue: pending references, newest first. Signed-in users
 * only; pending rows are hidden from the public read policy.
 */
export async function fetchPendingProductReferences(limit: number): Promise<PendingProductReference[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('fetch_pending_product_references', {
    result_limit: limit,
  })
  if (error) {
    console.error('fetchPendingProductReferences: RPC failed', error)
    throw error
  }
  return (data ?? []) as PendingProductReference[]
}
