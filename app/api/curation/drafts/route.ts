import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  createCurationDraft,
  findPartBySourceUrl,
  listCurationDrafts,
} from '@/lib/supabase/queries/curation'
import { getLicenseById } from '@/lib/supabase/queries/licenses'
import { validateSourceUrlMatchesPlatform } from '@/lib/supabase/queries/platforms'
import { parseJsonBody } from '@/lib/api/parse'
import { createCurationDraftSchema } from '@/lib/schemas/curation'
import { hasErrorCode } from '@/lib/utils/errors'
import { getApiTranslations } from '@/lib/api/translations'

// Postgres unique-violation SQLSTATE — raised by idx_parts_source_url when a
// draft invisible to the caller (another user's) already claims the URL.
const UNIQUE_VIOLATION = '23505'

// GET /api/curation/drafts — the caller's curated drafts for session resume.
export async function GET(request: Request) {
  const t = await getApiTranslations(request)
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: t('signInRequired') }, { status: 401 })
    }

    const drafts = await listCurationDrafts(user.id)
    return NextResponse.json({ drafts })
  } catch (error) {
    console.error('Failed to list curation drafts', error)
    return NextResponse.json({ error: t('serverError') }, { status: 500 })
  }
}

// POST /api/curation/drafts — creates the persistent draft once the source
// step is complete. Requires the DB minimum for origin_type 'curated':
// title, source URL, original author and the license chosen at the source,
// stored in license_id (#374). A part published
// elsewhere is always referenced (#396): the draft is created as link_out,
// so the source platform is required too.
export async function POST(request: NextRequest) {
  const t = await getApiTranslations(request)
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: t('signInRequired') }, { status: 401 })
    }

    // The files stay at the source, so the source platform claim is mandatory
    // and must match where the URL actually points (checked below).
    const body = await parseJsonBody(request, createCurationDraftSchema)
    if (!body.ok) return body.response
    const { title: name, sourceUrl, originalAuthor, originalAuthorUrl, licenseId, sourcePlatform } = body.data

    const license = await getLicenseById(licenseId)
    if (!license) {
      return NextResponse.json({ error: t('invalidLicense') }, { status: 400 })
    }

    // Single round trip: the helper covers both platform existence and the
    // URL domain match.
    const platformCheck = await validateSourceUrlMatchesPlatform(sourcePlatform, sourceUrl)
    if (!platformCheck.ok) {
      return NextResponse.json({ error: t(platformCheck.error) }, { status: platformCheck.status })
    }

    const duplicate = await findPartBySourceUrl(sourceUrl)
    if (duplicate) {
      return NextResponse.json(
        { error: t('sourceInRegistry'), duplicate },
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
        originalAuthorUrl,
      })
      return NextResponse.json({ draft }, { status: 201 })
    } catch (insertError) {
      // The pre-check cannot see other users' drafts; the unique index can.
      if (hasErrorCode(insertError, UNIQUE_VIOLATION)) {
        return NextResponse.json(
          { error: t('sourceClaimed'), duplicate: null },
          { status: 409 },
        )
      }
      throw insertError
    }
  } catch (error) {
    console.error('Failed to create curation draft', error)
    return NextResponse.json({ error: t('serverError') }, { status: 500 })
  }
}
