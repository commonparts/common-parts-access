import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withResolvedPartMedia } from '@/lib/storage/url'
import { omitKey } from '@/lib/utils/objects'
import {
  getUploadDraft,
  updateUploadDraft,
  type UploadDraftPatch,
} from '@/lib/supabase/queries/upload'
import { getLicenseById } from '@/lib/supabase/queries/licenses'
import { isHostableLicenseRow } from '@/lib/utils/licenses'
import { parseJsonBody } from '@/lib/api/parse'
import { toPartDraftColumns } from '@/lib/schemas/drafts'
import { updateUploadDraftSchema } from '@/lib/schemas/upload'
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

// PATCH /api/upload/drafts/[id] — partial autosave of the upload session.
// Accepts any subset of the editable fields; only provided keys are written.
export async function PATCH(request: NextRequest, context: RouteContext) {
  const t = await getApiTranslations(request)
  try {
    const { id } = await context.params
    const { user, draft } = await requireOwnDraft(id)
    if (!user) return NextResponse.json({ error: t('signInRequired') }, { status: 401 })
    if (!draft) return NextResponse.json({ error: t('draftNotFound') }, { status: 404 })
    if (draft.status !== 'draft') {
      return NextResponse.json({ error: t('onlyDraftsEditable') }, { status: 409 })
    }

    // Unknown keys are ignored; the fields the upload flow does not expose are
    // refused by name (see lib/schemas/upload.ts).
    const body = await parseJsonBody(request, updateUploadDraftSchema)
    if (!body.ok) return body.response
    const { categoryId, licenseId, productIds, ...fields } = body.data

    const supabase = await createClient()
    const patch: UploadDraftPatch = toPartDraftColumns(fields)

    if (categoryId !== undefined) {
      const { data: category, error } = await supabase.from('categories').select('id').eq('id', categoryId).maybeSingle()
      if (error || !category) return NextResponse.json({ error: t('invalidCategory') }, { status: 400 })
      patch.category_id = categoryId
    }

    if (licenseId !== undefined) {
      const license = await getLicenseById(licenseId)
      if (!license) return NextResponse.json({ error: t('invalidLicense') }, { status: 400 })
      if (!isHostableLicenseRow(license)) {
        return NextResponse.json(
          { error: t('hostingLicense') },
          { status: 400 },
        )
      }
      patch.license_id = licenseId
    }

    if (productIds !== undefined && productIds.length > 0) {
      const { data: rows, error } = await supabase.from('products').select('id').in('id', productIds)
      if (error || !rows || rows.length !== productIds.length) {
        return NextResponse.json({ error: t('invalidProducts') }, { status: 400 })
      }
    }

    await updateUploadDraft(id, user.id, patch, productIds)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to update upload draft', error)
    return NextResponse.json({ error: t('serverError') }, { status: 500 })
  }
}
