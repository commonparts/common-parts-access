import { NextRequest, NextResponse } from 'next/server'
import { searchAll } from '@/lib/supabase/queries/search'
import { EMPTY_SEARCH_RESULTS, SEARCH_DEFAULT_LIMIT } from '@/types/search'

// GET /api/search?q=&limit= — grouped multi-entity search (products, models,
// brands) with typo tolerance. Public endpoint; only published models surface.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') ?? ''

    // Whitespace-only queries return an empty payload with 200 — the RPC is
    // never touched (see searchAll), but short-circuit here too.
    if (!q.trim()) {
      return NextResponse.json(EMPTY_SEARCH_RESULTS)
    }

    const limitParam = Number.parseInt(searchParams.get('limit') ?? '', 10)
    const limit = Number.isNaN(limitParam) ? SEARCH_DEFAULT_LIMIT : limitParam

    const results = await searchAll(q, limit)
    return NextResponse.json(results)
  } catch (error) {
    console.error('Failed to run search:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
