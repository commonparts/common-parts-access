import { NextResponse } from 'next/server'
import { getActiveSourcePlatforms } from '@/lib/supabase/queries/platforms'
import { getApiTranslations } from '@/lib/api/translations'

// GET /api/source-platforms — Returns all active source platforms.
// Used by the upload form to populate the platform selector.
export async function GET(request: Request) {
  const t = await getApiTranslations(request)
  try {
    const platforms = await getActiveSourcePlatforms()
    return NextResponse.json({ platforms })
  } catch (error) {
    console.error('Failed to fetch source platforms:', error)
    return NextResponse.json({ error: t('loadFailed') }, { status: 500 })
  }
}
