import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchPartRequestCounts } from '@/lib/supabase/queries/part-requests'
import { parseSearchParams } from '@/lib/api/parse'
import { demandQuerySchema } from '@/lib/schemas/curation'

// GET /api/curation/demand?productId=… — read-only demand context for the
// curation tool: open part-request counts for the selected product, via the
// aggregate-only fetch_part_request_counts RPC (never row-level data).
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const query = parseSearchParams(request.nextUrl.searchParams, demandQuerySchema)
    if (!query.ok) return query.response

    const requests = await fetchPartRequestCounts(query.data.productId)
    return NextResponse.json({ requests })
  } catch (error) {
    console.error('Failed to fetch demand context', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
