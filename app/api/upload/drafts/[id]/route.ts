import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withResolvedPartMedia } from '@/lib/storage/url'
import { omitKey } from '@/lib/utils/objects'
import { getUploadDraft } from '@/lib/supabase/queries/upload'
import { isValidUuid } from '@/lib/utils/validation'
import { getApiTranslations } from '@/lib/api/translations'

type RouteContext = { params: Promise<{ id: string }> }

async function requireOwnDraft(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, draft: null }

  if (!isValidUuid(id)) return { user, draft: null }

  const draft = await getUploadDraft(id)
  if (!draft || draft.user_id !== user.id) return { user, draft: null }
  return { user, draft }
}

// GET /api/upload/drafts/[id] — full draft state for session resume.
export async function GET(request: NextRequest, context: RouteContext) {
  const t = await getApiTranslations(request)
  try {
    const { id } = await context.params
    const { user, draft } = await requireOwnDraft(id)
    if (!user) return NextResponse.json({ error: t('signInRequired') }, { status: 401 })
    if (!draft) return NextResponse.json({ error: t('draftNotFound') }, { status: 404 })

    // user_id is fetched for the ownership check only — never echoed back.
    const clientDraft = omitKey(withResolvedPartMedia(draft), 'user_id')
    return NextResponse.json({ draft: clientDraft })
  } catch (error) {
    console.error('Failed to load upload draft', error)
    return NextResponse.json({ error: t('serverError') }, { status: 500 })
  }
}
