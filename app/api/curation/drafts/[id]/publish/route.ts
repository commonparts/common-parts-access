import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurationDraft, updateCurationDraft } from '@/lib/supabase/queries/curation'
import { isChecklistComplete, missingCriteria } from '@/lib/curation/checklist'
import { isValidUuid } from '@/lib/utils/validation'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/curation/drafts/[id]/publish — the single publication gate of the
// curation flow. Re-validates every blocking condition server-side so a part
// failing any criterion cannot be published regardless of client state:
//   - all six checklist v1 criteria explicitly checked
//   - not flagged for legal review (saved but not publishable, Flow P3 §4.4)
//   - a whitelisted license set (hosting requires commercial + redistribution)
//   - at least one registered model file
//   - at least one linked product (the product_target criterion made concrete)
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

    if (!draft.license_id) {
      blockers.push('A publication license is required')
    } else {
      const { data: license, error } = await supabase
        .from('licenses')
        .select('id, allows_commercial, allows_redistribution')
        .eq('id', draft.license_id)
        .maybeSingle()
      if (error || !license) {
        blockers.push('The selected license could not be verified')
      } else if (!license.allows_commercial || !license.allows_redistribution) {
        blockers.push('Hosted parts require an open license (no NC/ND restrictions)')
      }
    }

    if (draft.model_file_count < 1) {
      blockers.push('At least one model file must be uploaded and registered')
    }

    if (draft.product_ids.length < 1) {
      blockers.push('At least one product must be linked')
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
