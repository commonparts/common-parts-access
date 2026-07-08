import { createClient } from '@/lib/supabase/server'
import type { PartRequestCount } from '@/types/database'

// Server-side bounds — mirror the CHECK constraints on part_requests so we
// reject bad input before the round-trip and return a clean 400.
const DESCRIPTION_MIN_LENGTH = 2
const DESCRIPTION_MAX_LENGTH = 500
const RAW_QUERY_MAX_LENGTH = 200
const PAGE_URL_MAX_LENGTH = 2048
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// ASCII control characters (C0 range plus DEL) are stripped from all text.
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g

export interface CreatePartRequestInput {
  productId?: string | null
  rawQuery?: string | null
  description?: string | null
  pageUrl?: string | null
}

interface ValidatedPartRequest {
  product_id: string | null
  raw_query: string | null
  description: string
  page_url: string | null
}

export type PartRequestValidation =
  | { ok: true; value: ValidatedPartRequest }
  | { ok: false; error: string }

// Strips control characters and trims; returns null for empty/blank input.
function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value.replace(CONTROL_CHARS, '').trim()
  return cleaned.length > 0 ? cleaned : null
}

/**
 * Validates and normalizes a raw part-request payload from the request body.
 * Does not throw — the endpoint maps `ok: false` to a 400. A non-empty
 * `description` is the core demand signal and is required; everything else is
 * optional context.
 */
export function validatePartRequestInput(body: unknown): PartRequestValidation {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Invalid request body' }
  }

  const input = body as CreatePartRequestInput

  const description = cleanText(input.description)
  if (!description) {
    return { ok: false, error: 'Description is required' }
  }
  if (description.length < DESCRIPTION_MIN_LENGTH) {
    return { ok: false, error: `Description must be at least ${DESCRIPTION_MIN_LENGTH} characters` }
  }
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    return { ok: false, error: `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters` }
  }

  const rawQuery = cleanText(input.rawQuery)
  if (rawQuery && rawQuery.length > RAW_QUERY_MAX_LENGTH) {
    return { ok: false, error: `Search term must be at most ${RAW_QUERY_MAX_LENGTH} characters` }
  }

  const pageUrl = cleanText(input.pageUrl)
  if (pageUrl && pageUrl.length > PAGE_URL_MAX_LENGTH) {
    return { ok: false, error: `Page URL must be at most ${PAGE_URL_MAX_LENGTH} characters` }
  }

  const productId = cleanText(input.productId)
  if (productId && !UUID_PATTERN.test(productId)) {
    return { ok: false, error: 'Invalid product id' }
  }

  return {
    ok: true,
    value: {
      product_id: productId,
      raw_query: rawQuery,
      description,
      page_url: pageUrl,
    },
  }
}

/**
 * Inserts a validated part request. Derives `user_id` from the authenticated
 * session (null for anonymous submissions) so callers cannot spoof attribution
 * — the insert RLS policy also enforces that a null `user_id` is only allowed
 * when there is no session, and otherwise `user_id = auth.uid()`.
 * Returns the new row id only; no row-level data is ever read back publicly.
 */
export async function createPartRequest(value: ValidatedPartRequest): Promise<string> {
  const supabase = await createClient()

  // Attribute to the signed-in user when there is one. A genuinely anonymous
  // caller yields a null user_id (allowed by RLS); a real auth error is logged
  // rather than swallowed. If a session exists but user_id came back null, RLS
  // fails the insert closed rather than storing a mis-attributed anonymous row.
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) {
    console.error('createPartRequest: failed to resolve authenticated user', authError)
  }

  const { data, error } = await supabase
    .from('part_requests')
    .insert({
      product_id: value.product_id,
      raw_query: value.raw_query,
      description: value.description,
      page_url: value.page_url,
      user_id: authData?.user?.id ?? null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('createPartRequest: insert failed', error)
    throw new Error(error.message || 'Failed to create part request')
  }

  return data.id
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

  return (data ?? []) as PartRequestCount[]
}
