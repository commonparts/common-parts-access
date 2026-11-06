import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withResolvedPartMedia } from '@/lib/storage/url'
import { createUploadDraft, listUploadDrafts } from '@/lib/supabase/queries/upload'
import { getLicenseById } from '@/lib/supabase/queries/licenses'
import { isHostableLicenseRow } from '@/lib/utils/licenses'
import { parseJsonBody } from '@/lib/api/parse'
import { createUploadDraftSchema } from '@/lib/schemas/upload'

// GET /api/upload/drafts — the contributor's own open upload drafts, for resume.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const drafts = await listUploadDrafts(user.id)
    return NextResponse.json({ drafts: drafts.map(withResolvedPartMedia) })
  } catch (error) {
    console.error('Failed to list upload drafts', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/upload/drafts — creates the draft once the first step is complete.
// Requires a title, a category, a hostable license, and the originality
// declaration. Everything else arrives via PATCH.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // The flow's narrowing (fields the contributor may not set, the explicit
    // originality declaration) is enforced by the schema, not in the form.
    const body = await parseJsonBody(request, createUploadDraftSchema)
    if (!body.ok) return body.response
    const { title: name, categoryId, licenseId } = body.data

    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .maybeSingle()
    if (categoryError || !category) {
      return NextResponse.json({ error: 'Invalid category selected' }, { status: 400 })
    }

    const license = await getLicenseById(licenseId)
    if (!license) {
      return NextResponse.json({ error: 'Invalid license selected' }, { status: 400 })
    }
    // The upload flow only hosts files, so the whitelist applies with no
    // link-out escape hatch: NC/ND parts cannot be published through it.
    if (!isHostableLicenseRow(license)) {
      return NextResponse.json(
        { error: 'Hosting requires a license allowing commercial use and modification (no NC/ND restrictions)' },
        { status: 400 },
      )
    }

    const draft = await createUploadDraft(user.id, { name, categoryId, licenseId })
    return NextResponse.json({ draft }, { status: 201 })
  } catch (error) {
    console.error('Failed to create upload draft', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
