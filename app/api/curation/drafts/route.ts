import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listCurationDrafts } from '@/lib/supabase/queries/curation'
import { getApiTranslations } from '@/lib/api/translations'

// GET /api/curation/drafts — the caller's curated drafts for session resume.
export async function GET(request: Request) {
  const t = await getApiTranslations(request)
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: t('signInRequired') }, { status: 401 })
    }

    const drafts = await listCurationDrafts(user.id)
    return NextResponse.json({ drafts })
  } catch (error) {
    console.error('Failed to list curation drafts', error)
    return NextResponse.json({ error: t('serverError') }, { status: 500 })
  }
}
