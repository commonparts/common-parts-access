import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { findModelBySourceUrl } from '@/lib/supabase/queries/curation'
import { isValidHttpUrl } from '@/lib/utils/validation'

const SOURCE_URL_MAX_LENGTH = 2048

// GET /api/curation/source-check?url=… — immediate duplicate check on
// models.source_url before a curation session invests any time in a source.
// Returns the existing part (id, name, slug, status) or null.
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = request.nextUrl.searchParams.get('url')?.trim() ?? ''
    if (!url || url.length > SOURCE_URL_MAX_LENGTH || !isValidHttpUrl(url)) {
      return NextResponse.json({ error: 'A valid http(s) source URL is required' }, { status: 400 })
    }

    const duplicate = await findModelBySourceUrl(url)
    return NextResponse.json({ duplicate })
  } catch (error) {
    console.error('Curation source check failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
