import { NextRequest, NextResponse } from 'next/server'
import { parseSearchParams } from '@/lib/api/parse'
import { candidatesQuerySchema } from '@/lib/schemas/search'
import { searchProductCandidates } from '@/lib/supabase/queries/search-demand'
import { getApiTranslations } from '@/lib/api/translations'

// GET /api/search/candidates?q= — products matching a brand/name query, for
// the zero-result "which product is it?" picker (issue #320). Public; looser
// than /api/search (half the query tokens suffice) and carries brand names.
export async function GET(request: NextRequest) {
  const t = await getApiTranslations(request)
  const query = await parseSearchParams(request, candidatesQuerySchema)
  if (!query.ok) return query.response
  const { q } = query.data
  if (!q) return NextResponse.json({ candidates: [] })

  try {
    const candidates = await searchProductCandidates(q)
    return NextResponse.json({ candidates })
  } catch (error) {
    console.error('Failed to search product candidates:', error)
    return NextResponse.json({ error: t('serverError') }, { status: 500 })
  }
}
