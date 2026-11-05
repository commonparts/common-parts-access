import { createClient } from '@/lib/supabase/server'
import type { PartRequestInput } from '@/lib/schemas/part-requests'
import type { PartRequestCount } from '@/types/database'

/**
 * Inserts a validated part request. Derives `user_id` from the authenticated
 * session (null for anonymous submissions) so callers cannot spoof attribution
 * — the insert RLS policy also enforces that a null `user_id` is only allowed
 * when there is no session, and otherwise `user_id = auth.uid()`.
 *
 * The insert intentionally does NOT chain `.select()`: part_requests has no
 * SELECT policy (no public row-level read), so requesting the row back would be
 * rejected by RLS. Nothing is read back — callers only need success/failure.
 */
export async function createPartRequest(value: PartRequestInput): Promise<void> {
  const supabase = await createClient()

  // Attribute to the signed-in user when there is one. A genuinely anonymous
  // caller yields a null user_id (allowed by RLS); a real auth error is logged
  // rather than swallowed. If a session exists but user_id came back null, RLS
  // fails the insert closed rather than storing a mis-attributed anonymous row.
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) {
    console.error('createPartRequest: failed to resolve authenticated user', authError)
  }

  const { error } = await supabase.from('part_requests').insert({
    product_id: value.productId,
    raw_query: value.rawQuery,
    description: value.description,
    page_url: value.pageUrl,
    user_id: authData?.user?.id ?? null,
  })

  if (error) {
    console.error('createPartRequest: insert failed', error)
    throw new Error(error.message || 'Failed to create part request')
  }
}

/**
 * Returns aggregated open-demand counts grouped by description for a product,
 * via the fetch_part_request_counts RPC. The RPC exposes only description and
 * count — never user_id, raw_query, or any row-level data.
 */
export async function fetchPartRequestCounts(productId: string): Promise<PartRequestCount[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('fetch_part_request_counts', {
    p_product_id: productId,
  })

  if (error) {
    console.error('fetchPartRequestCounts: RPC failed', error)
    throw error
  }

  return data ?? []
}
