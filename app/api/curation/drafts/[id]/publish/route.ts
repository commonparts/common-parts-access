import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurationDraft } from '@/lib/supabase/queries/curation'
import { getLicenseById } from '@/lib/supabase/queries/licenses'
import { findProductLinkBlocker } from '@/lib/supabase/queries/products'
import { publishDraftPart } from '@/lib/supabase/queries/publish'
import { isChecklistComplete, missingCriteria } from '@/lib/curation/checklist'
import { CURATED_FILE_HOSTING_TYPE } from '@/lib/curation/hosting'
import { isValidUuid } from '@/lib/utils/validation'
import { getApiTranslations } from '@/lib/api/translations'
import { getTranslations } from 'next-intl/server'
import { requestLocale } from '@/lib/utils/locale'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/curation/drafts/[id]/publish — the single publication gate of the
// curation flow. Re-validates every blocking condition server-side so a part
// failing any criterion cannot be published regardless of client state:
//   - all six checklist v1 criteria explicitly checked
//   - not flagged for legal review (saved but not publishable, Flow P3 §4.4)
//   - link_out: a part published elsewhere is always referenced, never hosted
//     (#396) — a hosted curated draft cannot be published
//   - the license chosen at the source (license_id, #374), from the licenses
//     table; NC/ND is acceptable because the files stay at the source
//   - a source platform, and NO registered model files
//   - at least one linked product (the product_target criterion made concrete),
//     each belonging to a brand — same invariant as the upload gate. Since
//     #315 a part's brands are its products', so a brandless product leaves
//     the part unreachable through brand -> product -> part navigation.
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

    const draft = await getCurationDraft(id)
    if (!draft || draft.user_id !== user.id) {
      return NextResponse.json({ error: t('draftNotFound') }, { status: 404 })
    }
    if (draft.status !== 'draft') {
      return NextResponse.json({ error: t('alreadyPublished') }, { status: 409 })
    }

    const blockers: string[] = []

    if (!isChecklistComplete(draft.curation_checklist)) {
      const labels = await getTranslations({ locale: requestLocale(request), namespace: 'CurationCriteria' })
      const missing = missingCriteria(draft.curation_checklist).map((criterion) => labels(`${criterion}.label`))
      blockers.push(t('blockers.criteria', { criteria: missing.join(', ') }))
    }

    if (draft.needs_legal_review) {
      blockers.push(t('blockers.legalReview'))
    }

    if (draft.file_hosting_type !== CURATED_FILE_HOSTING_TYPE) {
      blockers.push(t('blockers.hosted'))
    }

    if (!draft.license_id) {
      blockers.push(t('blockers.sourceLicense'))
    } else {
      const license = await getLicenseById(draft.license_id)
      if (!license) {
        blockers.push(t('blockers.licenseUnverified'))
      }
    }

    if (!draft.source_platform) {
      blockers.push(t('sourcePlatformRequired'))
    }
    if (draft.model_file_count > 0) {
      blockers.push(t('blockers.removeModelFiles'))
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
    console.error('Failed to publish curated part', error)
    return NextResponse.json({ error: t('serverError') }, { status: 500 })
  }
}
