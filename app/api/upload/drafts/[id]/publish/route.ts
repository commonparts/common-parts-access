import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUploadDraft } from '@/lib/supabase/queries/upload'
import { getLicenseById } from '@/lib/supabase/queries/licenses'
import { findProductLinkBlocker } from '@/lib/supabase/queries/products'
import { publishDraftPart } from '@/lib/supabase/queries/publish'
import { isHostableLicenseRow } from '@/lib/utils/licenses'
import { isValidUuid } from '@/lib/utils/validation'
import { getApiTranslations } from '@/lib/api/translations'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/upload/drafts/[id]/publish — the single publication gate of the
// public upload flow (issue #293). Re-validates every blocking condition
// server-side so no client state can put a part live that should not be:
//   - a title and a category
//   - a license that permits hosting here (no NC/ND) — the flow only hosts
//   - the originality declaration recorded on the row
//   - at least one registered model file
//   - at least one linked product, each belonging to a brand — without that
//     the part is unreachable through the device-based navigation of Flow P2,
//     which descends brand -> product -> part. The brands are the products'
//     (issue #315), so linking products of several brands files the part
//     under all of them.
// The draft -> published transition itself runs with the service role, so
// that the database can refuse it from the public API keys (#403).
export async function POST(request: NextRequest, context: RouteContext) {
  const t = await getApiTranslations(request)
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: t('signInRequired') }, { status: 401 })
    }

    const { id } = await context.params
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: t('draftNotFound') }, { status: 404 })
    }

    const draft = await getUploadDraft(id)
    if (!draft || draft.user_id !== user.id) {
      return NextResponse.json({ error: t('draftNotFound') }, { status: 404 })
    }
    if (draft.status !== 'draft') {
      return NextResponse.json({ error: t('alreadyPublished') }, { status: 409 })
    }

    const blockers: string[] = []

    if (!draft.name?.trim()) {
      blockers.push(t('blockers.title'))
    }

    if (!draft.category_id) {
      blockers.push(t('blockers.category'))
    }

    if (!draft.originality_attested) {
      blockers.push(t('blockers.attestation'))
    }

    if (!draft.license_id) {
      blockers.push(t('blockers.license'))
    } else {
      const license = await getLicenseById(draft.license_id)
      if (!license) {
        blockers.push(t('blockers.licenseUnverified'))
      } else if (!isHostableLicenseRow(license)) {
        blockers.push(t('hostingLicense'))
      }
    }

    if (draft.model_file_count < 1) {
      blockers.push(t('blockers.modelFile'))
    }

    if (draft.product_ids.length < 1) {
      blockers.push(t('blockers.product'))
    } else {
      const linkBlocker = await findProductLinkBlocker(draft.product_ids)
      if (linkBlocker) blockers.push(t(`blockers.${linkBlocker}`))
    }

    if (blockers.length > 0) {
      return NextResponse.json({ error: t('publicationBlocked'), blockers }, { status: 422 })
    }

    const published = await publishDraftPart(id, user.id)
    if (!published) {
      return NextResponse.json({ error: t('alreadyPublished') }, { status: 409 })
    }
    return NextResponse.json({ ok: true, slug: draft.slug })
  } catch (error) {
    console.error('Failed to publish uploaded part', error)
    return NextResponse.json({ error: t('serverError') }, { status: 500 })
  }
}
