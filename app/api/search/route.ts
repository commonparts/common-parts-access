import { NextRequest, NextResponse } from 'next/server'
import { searchAll } from '@/lib/supabase/queries/search'
import { parseSearchParams } from '@/lib/api/parse'
import { searchQuerySchema } from '@/lib/schemas/search'
import { emptySearchResults } from '@/types/search'

// GET /api/search?q=&limit= — grouped multi-entity search (products, parts,
// brands) with typo tolerance. Public endpoint; only published parts surface,
// every product is searchable and listed products rank first (issue #321).
export async function GET(request: NextRequest) {
  try {
    const query = parseSearchParams(request.nextUrl.searchParams, searchQuerySchema)
    if (!query.ok) return query.response
    const { q, limit } = query.data

    // Whitespace-only queries return an empty payload with 200 — the RPC is
    // never touched (see searchAll), but short-circuit here too.
    if (!q.trim()) {
      return NextResponse.json(emptySearchResults())
    }

    const results = await searchAll(q, limit)
    return NextResponse.json(results)
  } catch (error) {
    console.error('Failed to run search:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
