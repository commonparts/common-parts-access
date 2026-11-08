import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withResolvedPartMedia } from '@/lib/storage/url'
import { listUploadDrafts } from '@/lib/supabase/queries/upload'
import { getApiTranslations } from '@/lib/api/translations'

// GET /api/upload/drafts — the contributor's own open upload drafts, for resume.
export async function GET(request: Request) {
  const t = await getApiTranslations(request)
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: t('signInRequired') }, { status: 401 })
    }

    const drafts = await listUploadDrafts(user.id)
    return NextResponse.json({ drafts: drafts.map(withResolvedPartMedia) })
  } catch (error) {
    console.error('Failed to list upload drafts', error)
    return NextResponse.json({ error: t('serverError') }, { status: 500 })
  }
}
