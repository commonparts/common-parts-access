import { NextResponse } from 'next/server'
import { getActiveSourcePlatforms } from '@/lib/supabase/queries/platforms'

// GET /api/source-platforms — Returns all active source platforms.
// Used by the upload form to populate the platform selector.
export async function GET() {
  try {
    const platforms = await getActiveSourcePlatforms()
    return NextResponse.json({ platforms })
  } catch (error) {
    console.error('Failed to fetch source platforms:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
