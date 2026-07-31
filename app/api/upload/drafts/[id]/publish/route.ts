import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUploadDraft, updateUploadDraft } from '@/lib/supabase/queries/upload'
import { getLicenseById } from '@/lib/supabase/queries/licenses'
import { isHostableLicenseRow } from '@/lib/utils/licenses'
import { ATTESTATION_BLOCKER } from '@/lib/upload/attestation'
import { isValidUuid } from '@/lib/utils/validation'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/upload/drafts/[id]/publish — the single publication gate of the
// public upload flow (issue #293). Re-validates every blocking condition
// server-side so no client state can put a part live that should not be:
//   - a title and a category
//   - a license that permits hosting here (no NC/ND) — the flow only hosts
//   - the originality declaration recorded on the row
//   - at least one registered model file
//   - at least one linked product, without which the part is unreachable
//     through the device-based navigation of Flow P2
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

    const draft = await getUploadDraft(id)
    if (!draft || draft.user_id !== user.id) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }
    if (draft.status !== 'draft') {
      return NextResponse.json({ error: 'This part is already published' }, { status: 409 })
    }

    const blockers: string[] = []

    if (!draft.name?.trim()) {
      blockers.push('A title is required')
    }

    if (!draft.category_id) {
      blockers.push('A category is required')
    }

    if (!draft.originality_attested) {
      blockers.push(ATTESTATION_BLOCKER)
    }

    if (!draft.license_id) {
      blockers.push('A license is required')
    } else {
      const license = await getLicenseById(draft.license_id)
      if (!license) {
        blockers.push('The selected license could not be verified')
      } else if (!isHostableLicenseRow(license)) {
        blockers.push('Hosting requires a license allowing commercial use and modification (no NC/ND restrictions)')
      }
    }

    if (draft.model_file_count < 1) {
      blockers.push('At least one model file must be uploaded')
    }

    if (draft.product_ids.length < 1) {
      blockers.push('At least one compatible product must be linked — without it the part cannot be found by device')
    }

    if (blockers.length > 0) {
      return NextResponse.json({ error: 'Publication blocked', blockers }, { status: 422 })
    }

    await updateUploadDraft(id, user.id, { status: 'published' })
    return NextResponse.json({ ok: true, slug: draft.slug })
  } catch (error) {
    console.error('Failed to publish uploaded part', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
