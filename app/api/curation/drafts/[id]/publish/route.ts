import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurationDraft, updateCurationDraft } from '@/lib/supabase/queries/curation'
import { getLicenseById } from '@/lib/supabase/queries/licenses'
import { findProductLinkBlocker } from '@/lib/supabase/queries/products'
import { isChecklistComplete, missingCriteria } from '@/lib/curation/checklist'
import { CURATED_FILE_HOSTING_TYPE } from '@/lib/curation/hosting'
import { isValidUuid } from '@/lib/utils/validation'

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
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    const draft = await getCurationDraft(id)
    if (!draft || draft.user_id !== user.id) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }
    if (draft.status !== 'draft') {
      return NextResponse.json({ error: 'This part is already published' }, { status: 409 })
    }

    const blockers: string[] = []

    if (!isChecklistComplete(draft.curation_checklist)) {
      const missing = missingCriteria(draft.curation_checklist)
      blockers.push(`Unchecked blocking criteria: ${missing.join(', ')}`)
    }

    if (draft.needs_legal_review) {
      blockers.push('The part is flagged for legal review and cannot be published')
    }

    if (draft.file_hosting_type !== CURATED_FILE_HOSTING_TYPE) {
      blockers.push(
        'A part published elsewhere is always referenced, never hosted — save the Origin step again to reference it at its source',
      )
    }

    if (!draft.license_id) {
      blockers.push('The license at the source is required')
    } else {
      const license = await getLicenseById(draft.license_id)
      if (!license) {
        blockers.push('The selected license could not be verified')
      }
    }

    if (!draft.source_platform) {
      blockers.push('A source platform is required for a part published elsewhere')
    }
    if (draft.model_file_count > 0) {
      blockers.push('A part published elsewhere must not host model files — remove them')
    }

    if (draft.product_ids.length < 1) {
      blockers.push('At least one product must be linked')
    } else {
      const linkBlocker = await findProductLinkBlocker(draft.product_ids)
      if (linkBlocker) blockers.push(linkBlocker)
    }

    if (blockers.length > 0) {
      return NextResponse.json({ error: 'Publication blocked', blockers }, { status: 422 })
    }

    await updateCurationDraft(id, user.id, { status: 'published' })
    return NextResponse.json({ ok: true, slug: draft.slug })
  } catch (error) {
    console.error('Failed to publish curated part', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
