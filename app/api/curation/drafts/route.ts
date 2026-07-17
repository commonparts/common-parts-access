import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createCurationDraft,
  findModelBySourceUrl,
  listCurationDrafts,
} from '@/lib/supabase/queries/curation'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'
import { isValidHttpUrl, isValidUuid, trimmedString } from '@/lib/utils/validation'

const SOURCE_URL_MAX_LENGTH = 2048
const AUTHOR_MAX_LENGTH = 200

// Postgres unique-violation SQLSTATE — raised by idx_models_source_url when a
// draft invisible to the caller (another user's) already claims the URL.
const UNIQUE_VIOLATION = '23505'

// GET /api/curation/drafts — the caller's curated drafts for session resume.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const drafts = await listCurationDrafts(user.id)
    return NextResponse.json({ drafts })
  } catch (error) {
    console.error('Failed to list curation drafts', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/curation/drafts — creates the persistent draft once the source
// step is complete. Requires the DB minimum for origin_type 'curated':
// title, source URL, original author and source license.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const payload = body as Record<string, unknown>

    const name = trimmedString(payload.title)
    const sourceUrl = trimmedString(payload.sourceUrl)
    const originalAuthor = trimmedString(payload.originalAuthor)
    const originalAuthorUrl = trimmedString(payload.originalAuthorUrl)
    const sourceLicenseId = trimmedString(payload.sourceLicenseId)
    const sourcePlatform = trimmedString(payload.sourcePlatform)

    if (name.length < VALIDATION_LIMITS.MODEL.TITLE_MIN_LENGTH || name.length > VALIDATION_LIMITS.MODEL.TITLE_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Title must be between ${VALIDATION_LIMITS.MODEL.TITLE_MIN_LENGTH} and ${VALIDATION_LIMITS.MODEL.TITLE_MAX_LENGTH} characters` },
        { status: 400 },
      )
    }
    if (!sourceUrl || sourceUrl.length > SOURCE_URL_MAX_LENGTH || !isValidHttpUrl(sourceUrl)) {
      return NextResponse.json({ error: 'A valid http(s) source URL is required' }, { status: 400 })
    }
    if (!originalAuthor || originalAuthor.length > AUTHOR_MAX_LENGTH) {
      return NextResponse.json({ error: `Original author is required (max ${AUTHOR_MAX_LENGTH} characters)` }, { status: 400 })
    }
    if (originalAuthorUrl && (originalAuthorUrl.length > SOURCE_URL_MAX_LENGTH || !isValidHttpUrl(originalAuthorUrl))) {
      return NextResponse.json({ error: 'Original author URL must be a valid http(s) URL' }, { status: 400 })
    }
    if (!isValidUuid(sourceLicenseId)) {
      return NextResponse.json({ error: 'Source license is required' }, { status: 400 })
    }

    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('id')
      .eq('id', sourceLicenseId)
      .maybeSingle()
    if (licenseError || !license) {
      return NextResponse.json({ error: 'Invalid source license selected' }, { status: 400 })
    }

    if (sourcePlatform) {
      const { data: platform, error: platformError } = await supabase
        .from('source_platforms')
        .select('slug')
        .eq('slug', sourcePlatform)
        .maybeSingle()
      if (platformError || !platform) {
        return NextResponse.json({ error: 'Unknown source platform' }, { status: 400 })
      }
    }

    const duplicate = await findModelBySourceUrl(sourceUrl)
    if (duplicate) {
      return NextResponse.json(
        { error: 'This source URL is already in the registry', duplicate },
        { status: 409 },
      )
    }

    try {
      const draft = await createCurationDraft(user.id, {
        name,
        sourceUrl,
        originalAuthor,
        sourceLicenseId,
        sourcePlatform: sourcePlatform || null,
        originalAuthorUrl: originalAuthorUrl || null,
      })
      return NextResponse.json({ draft }, { status: 201 })
    } catch (insertError) {
      // The pre-check cannot see other users' drafts; the unique index can.
      if (typeof insertError === 'object' && insertError !== null && (insertError as { code?: string }).code === UNIQUE_VIOLATION) {
        return NextResponse.json(
          { error: 'This source URL is already claimed by another draft', duplicate: null },
          { status: 409 },
        )
      }
      throw insertError
    }
  } catch (error) {
    console.error('Failed to create curation draft', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
