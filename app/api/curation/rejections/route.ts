import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { insertCurationRejection } from '@/lib/supabase/queries/curation'
import { parseJsonBody } from '@/lib/api/parse'
import { curationRejectionSchema } from '@/lib/schemas/curation'
import { getApiTranslations } from '@/lib/api/translations'

// POST /api/curation/rejections — rejection traceability (Flow P3 §4.3.3).
// Records which source was rejected, why, and which blocking criteria failed;
// no part row is required.
export async function POST(request: NextRequest) {
  const t = await getApiTranslations(request)
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: t('signInRequired') }, { status: 401 })
    }

    const body = await parseJsonBody(request, curationRejectionSchema)
    if (!body.ok) return body.response

    await insertCurationRejection(user.id, body.data)
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    console.error('Failed to record curation rejection', error)
    return NextResponse.json({ error: t('serverError') }, { status: 500 })
  }
}
