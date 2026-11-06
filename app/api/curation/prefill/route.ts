import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPrefillFromSourceUrl } from '@/lib/curation/prefill'
import { parseSearchParams } from '@/lib/api/parse'
import { sourceUrlQuerySchema } from '@/lib/schemas/curation'

// GET /api/curation/prefill?url=… — best-effort pre-fill of the curation
// source step (platform, author, declared license) from a source URL.
// Extraction runs server-side only; a failed extraction returns null fields,
// never an error — the tool must never block on it (Flow P3 §4.4).
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

    const prefill = await getPrefillFromSourceUrl(url)
    return NextResponse.json({ prefill })
  } catch (error) {
    console.error('Curation prefill failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
