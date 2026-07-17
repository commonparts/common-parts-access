import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { insertCurationRejection } from '@/lib/supabase/queries/curation'
import { CURATION_BLOCKING_CRITERIA } from '@/lib/curation/checklist'
import { isValidHttpUrl, trimmedString } from '@/lib/utils/validation'

const SOURCE_URL_MAX_LENGTH = 2048
const REASON_MAX_LENGTH = 1000

const CRITERION_KEYS = new Set<string>(CURATION_BLOCKING_CRITERIA.map((c) => c.key))

// POST /api/curation/rejections — rejection traceability (Flow P3 §4.3.3).
// Records which source was rejected, why, and which blocking criteria failed;
// no model row is required.
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

    const sourceUrl = trimmedString(payload.sourceUrl)
    const reason = trimmedString(payload.reason)

    if (!sourceUrl || sourceUrl.length > SOURCE_URL_MAX_LENGTH || !isValidHttpUrl(sourceUrl)) {
      return NextResponse.json({ error: 'A valid http(s) source URL is required' }, { status: 400 })
    }
    if (!reason || reason.length > REASON_MAX_LENGTH) {
      return NextResponse.json({ error: `A rejection reason is required (max ${REASON_MAX_LENGTH} characters)` }, { status: 400 })
    }

    const failedCriteria = Array.isArray(payload.failedCriteria)
      ? [...new Set(payload.failedCriteria.filter((c): c is string => typeof c === 'string' && CRITERION_KEYS.has(c)))]
      : []

    await insertCurationRejection(user.id, { sourceUrl, reason, failedCriteria })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error('Failed to record curation rejection', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
