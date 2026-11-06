import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findPartBySourceUrl } from '@/lib/supabase/queries/curation'
import { parseSearchParams } from '@/lib/api/parse'
import { sourceUrlQuerySchema } from '@/lib/schemas/curation'

// GET /api/curation/source-check?url=… — immediate duplicate check on
// parts.source_url before a curation session invests any time in a source.
// Returns the existing part (id, name, slug, status) or null.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const query = parseSearchParams(request.nextUrl.searchParams, sourceUrlQuerySchema)
    if (!query.ok) return query.response
    const { url } = query.data

    const duplicate = await findPartBySourceUrl(url)
    return NextResponse.json({ duplicate })
  } catch (error) {
    console.error('Curation source check failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
