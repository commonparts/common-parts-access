import { NextRequest, NextResponse } from 'next/server'
import { searchProductCandidates } from '@/lib/supabase/queries/search-demand'

// GET /api/search/candidates?q= — products matching a brand/name query, for
// the zero-result "which product is it?" picker (issue #320). Public; looser
// than /api/search (half the query tokens suffice) and carries brand names.
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (!q) return NextResponse.json({ candidates: [] })

  try {
    const candidates = await searchProductCandidates(q)
    return NextResponse.json({ candidates })
  } catch (error) {
    console.error('Failed to search product candidates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
