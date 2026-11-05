import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withResolvedPartMedia } from '@/lib/storage/url'
import { omitKey } from '@/lib/utils/objects'
import {
  getCurationDraft,
  updateCurationDraft,
  type CurationDraftPatch,
} from '@/lib/supabase/queries/curation'
import { CURATED_FILE_HOSTING_TYPE } from '@/lib/curation/hosting'
import { getLicenseById } from '@/lib/supabase/queries/licenses'
import { validateSourceUrlMatchesPlatform } from '@/lib/supabase/queries/platforms'
import { parseJsonBody } from '@/lib/api/parse'
import { toPartDraftColumns } from '@/lib/schemas/drafts'
import { updateCurationDraftSchema } from '@/lib/schemas/curation'
import { isValidUuid } from '@/lib/utils/validation'

type RouteContext = { params: Promise<{ id: string }> }

async function requireOwnDraft(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { user: null, draft: null }

  if (!isValidUuid(id)) return { user, draft: null }

  const draft = await getCurationDraft(id)
  if (!draft || draft.user_id !== user.id) return { user, draft: null }
  return { user, draft }
}

// GET /api/curation/drafts/[id] — full draft state for session resume.
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const { user, draft } = await requireOwnDraft(id)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })

    // user_id is fetched for the ownership check only — never echoed back.
    const clientDraft = omitKey(withResolvedPartMedia(draft), 'user_id')
    return NextResponse.json({ draft: clientDraft })
  } catch (error) {
    console.error('Failed to load curation draft', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/curation/drafts/[id] — partial autosave of the curation session.
// Accepts any subset of the editable fields; only provided keys are written.
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const { user, draft } = await requireOwnDraft(id)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    if (draft.status !== 'draft') {
      return NextResponse.json({ error: 'Only drafts can be edited by the curation tool' }, { status: 409 })
    }

    const body = await parseJsonBody(request, updateCurationDraftSchema)
    if (!body.ok) return body.response
    const {
      categoryId,
      licenseId,
      sourcePlatform,
      fileHostingType,
      originalAuthor,
      originalAuthorUrl,
      checklist,
      legalReviewJustification,
      needs_verification,
      needs_print_settings,
      needs_photo,
      needs_instructions,
      needs_category,
      needs_legal_review,
      productIds,
      ...fields
    } = body.data

    const supabase = await createClient()
    const patch: CurationDraftPatch = {
      ...toPartDraftColumns(fields),
      ...(sourcePlatform !== undefined && { source_platform: sourcePlatform }),
      ...(originalAuthor !== undefined && { original_author: originalAuthor }),
      ...(originalAuthorUrl !== undefined && { original_author_url: originalAuthorUrl }),
      ...(checklist !== undefined && { curation_checklist: checklist }),
      ...(needs_verification !== undefined && { needs_verification }),
      ...(needs_print_settings !== undefined && { needs_print_settings }),
      ...(needs_photo !== undefined && { needs_photo }),
      ...(needs_instructions !== undefined && { needs_instructions }),
      ...(needs_category !== undefined && { needs_category }),
      ...(needs_legal_review !== undefined && { needs_legal_review }),
      ...(legalReviewJustification !== undefined && { legal_review_justification: legalReviewJustification }),
    }

    if (categoryId !== undefined) {
      if (categoryId) {
        const { data: category, error } = await supabase.from('categories').select('id').eq('id', categoryId).maybeSingle()
        if (error || !category) return NextResponse.json({ error: 'Invalid category selected' }, { status: 400 })
      }
      patch.category_id = categoryId
    }

    if (licenseId !== undefined) {
      const license = await getLicenseById(licenseId)
      if (!license) return NextResponse.json({ error: 'Invalid license selected' }, { status: 400 })
      patch.license_id = licenseId
    }

    if (fileHostingType !== undefined) {
      // A part published elsewhere is always referenced (#396): the schema
      // only lets link_out through, which also moves a draft created before
      // the rule to it. Files already registered in storage contradict
      // link-out (the whole point is NOT hosting them).
      if (draft.model_file_count > 0) {
        return NextResponse.json(
          { error: 'Model files are already uploaded — a part published elsewhere must not host files; remove them first' },
          { status: 409 },
        )
      }
      patch.file_hosting_type = fileHostingType
    }

    // Cross-field invariant: the resulting state of a link-out draft must name
    // a source platform whose domain matches the (immutable) source URL. This
    // is also the single place platform existence is checked (one round trip).
    const nextHostingType = patch.file_hosting_type ?? draft.file_hosting_type ?? CURATED_FILE_HOSTING_TYPE
    const nextPlatform = patch.source_platform !== undefined ? patch.source_platform : draft.source_platform ?? null
    if (nextHostingType === 'link_out') {
      if (!nextPlatform) {
        return NextResponse.json({ error: 'A source platform is required for a part published elsewhere' }, { status: 400 })
      }
      const platformCheck = await validateSourceUrlMatchesPlatform(nextPlatform, draft.source_url ?? '')
      if (!platformCheck.ok) {
        return NextResponse.json({ error: platformCheck.error }, { status: platformCheck.status })
      }
    } else if (patch.source_platform) {
      const { data: platform, error } = await supabase
        .from('source_platforms')
        .select('slug')
        .eq('slug', patch.source_platform)
        .maybeSingle()
      if (error || !platform) return NextResponse.json({ error: 'Unknown source platform' }, { status: 400 })
    }

    // The DB constraint also enforces this pair; failing early gives a clean 400.
    const nextNeedsLegalReview = patch.needs_legal_review ?? draft.needs_legal_review ?? false
    const nextJustification = patch.legal_review_justification !== undefined
      ? patch.legal_review_justification
      : draft.legal_review_justification ?? null
    if (nextNeedsLegalReview && !nextJustification) {
      return NextResponse.json({ error: 'A justification is required when flagging for legal review' }, { status: 400 })
    }

    if (productIds !== undefined && productIds.length > 0) {
      const { data: rows, error } = await supabase.from('products').select('id').in('id', productIds)
      if (error || !rows || rows.length !== productIds.length) {
        return NextResponse.json({ error: 'One or more selected products are invalid' }, { status: 400 })
      }
    }

    await updateCurationDraft(id, user.id, patch, productIds)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Failed to update curation draft', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
