import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createCurationDraft,
  findPartBySourceUrl,
  listCurationDrafts,
} from '@/lib/supabase/queries/curation'
import { getLicenseById } from '@/lib/supabase/queries/licenses'
import { validateSourceUrlMatchesPlatform } from '@/lib/supabase/queries/platforms'
import { parseCuratedHostingType } from '@/lib/curation/hosting'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'
import { isValidHttpUrl, isValidUuid, trimmedString } from '@/lib/utils/validation'

const SOURCE_URL_MAX_LENGTH = 2048
const AUTHOR_MAX_LENGTH = 200

// Postgres unique-violation SQLSTATE — raised by idx_parts_source_url when a
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
// title, source URL, original author and the license chosen at the source,
// stored in license_id (#374). A part published
// elsewhere is always referenced (#396): the draft is created as link_out,
// so the source platform is required too.
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
    const licenseId = trimmedString(payload.licenseId)
    const sourcePlatform = trimmedString(payload.sourcePlatform)
    const hostingType = parseCuratedHostingType(payload.fileHostingType)
    if (!hostingType.ok) {
      return NextResponse.json({ error: hostingType.error }, { status: 400 })
    }

    // The files stay at the source, so the source platform claim is mandatory
    // and must match where the URL actually points.
    if (!sourcePlatform) {
      return NextResponse.json({ error: 'A source platform is required for a part published elsewhere' }, { status: 400 })
    }

    if (name.length < VALIDATION_LIMITS.PART.TITLE_MIN_LENGTH || name.length > VALIDATION_LIMITS.PART.TITLE_MAX_LENGTH) {
      return NextResponse.json(
        { error: `Title must be between ${VALIDATION_LIMITS.PART.TITLE_MIN_LENGTH} and ${VALIDATION_LIMITS.PART.TITLE_MAX_LENGTH} characters` },
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
    if (!isValidUuid(licenseId)) {
      return NextResponse.json({ error: 'The license at the source is required' }, { status: 400 })
    }

    const license = await getLicenseById(licenseId)
    if (!license) {
      return NextResponse.json({ error: 'Invalid license selected' }, { status: 400 })
    }

    // Single round trip: the helper covers both platform existence and the
    // URL domain match.
    const platformCheck = await validateSourceUrlMatchesPlatform(sourcePlatform, sourceUrl)
    if (!platformCheck.ok) {
      return NextResponse.json({ error: platformCheck.error }, { status: platformCheck.status })
    }

    const duplicate = await findPartBySourceUrl(sourceUrl)
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
        licenseId,
        sourcePlatform,
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
