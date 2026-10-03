import { NextRequest, NextResponse } from 'next/server'
import { attachProductReference } from '@/lib/supabase/queries/search-demand'
import { parseAcceptLanguage } from '@/lib/utils/locale'
import { validateReferenceAttachment } from '@/lib/utils/product-references'

/**
 * POST /api/product-references — a visitor tells us which product an unknown
 * reference belongs to, from the zero-result search page (issue #320). Open
 * to anonymous visitors. The reference is stored pending and only becomes
 * visible and searchable once validated in the Supabase dashboard, so nothing
 * a visitor sends reaches other visitors unreviewed.
 */
export async function POST(request: NextRequest) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid reference: body must be JSON' }, { status: 400 })
  }

  const validation = validateReferenceAttachment(payload)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  try {
    const locale = parseAcceptLanguage(request.headers.get('accept-language'))
    const result = await attachProductReference(validation.value, locale)

    if (result === 'unknown_product') {
      return NextResponse.json({ error: 'Invalid reference: that product does not exist' }, { status: 404 })
    }
    if (result === 'invalid_value') {
      return NextResponse.json({ error: 'Invalid reference: the value needs at least one letter or digit' }, { status: 400 })
    }
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Failed to attach product reference:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
