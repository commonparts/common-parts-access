import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createUploadDraft, listUploadDrafts } from '@/lib/supabase/queries/upload'
import { getLicenseById } from '@/lib/supabase/queries/licenses'
import { isHostableLicenseRow } from '@/lib/utils/licenses'
import { findForbiddenField, forbiddenFieldError } from '@/lib/upload/payload'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'
import { isValidUuid, trimmedString } from '@/lib/utils/validation'

// GET /api/upload/drafts — the contributor's own open upload drafts, for resume.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const drafts = await listUploadDrafts(user.id)
    return NextResponse.json({ drafts })
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

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const payload = body as Record<string, unknown>

    // The flow's narrowing is enforced here, not in the form.
    const forbidden = findForbiddenField(payload)
    if (forbidden) {
      return NextResponse.json({ error: forbiddenFieldError(forbidden) }, { status: 400 })
    }

    const name = trimmedString(payload.title)
    const categoryId = trimmedString(payload.categoryId)
    const licenseId = trimmedString(payload.licenseId)

    if (name.length < VALIDATION_LIMITS.MODEL.TITLE_MIN_LENGTH || name.length > VALIDATION_LIMITS.MODEL.TITLE_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Title must be between ${VALIDATION_LIMITS.MODEL.TITLE_MIN_LENGTH} and ${VALIDATION_LIMITS.MODEL.TITLE_MAX_LENGTH} characters` },
        { status: 400 },
      )
    }

    // The declaration must be an explicit true — a missing or truthy-ish value
    // is not someone claiming authorship of a design.
    if (payload.attested !== true) {
      return NextResponse.json(
        { error: 'The originality declaration must be confirmed to start an upload' },
        { status: 400 },
      )
    }

    if (!isValidUuid(categoryId)) {
      return NextResponse.json({ error: 'A category is required' }, { status: 400 })
    }
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id')
      .eq('id', categoryId)
      .maybeSingle()
    if (categoryError || !category) {
      return NextResponse.json({ error: 'Invalid category selected' }, { status: 400 })
    }

    if (!isValidUuid(licenseId)) {
      return NextResponse.json({ error: 'A license is required' }, { status: 400 })
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
