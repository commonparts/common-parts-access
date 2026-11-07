import { NextRequest, NextResponse } from 'next/server'
import { attachProductReference } from '@/lib/supabase/queries/search-demand'
import { parseAcceptLanguage } from '@/lib/utils/locale'
import { parseJsonBody } from '@/lib/api/parse'
import { referenceAttachmentSchema } from '@/lib/schemas/search'
import { getApiTranslations } from '@/lib/api/translations'

/**
 * POST /api/product-references — a visitor tells us which product an unknown
 * reference belongs to, from the zero-result search page (issue #320). Open
 * to anonymous visitors. The reference is stored pending and only becomes
 * visible and searchable once validated in the Supabase dashboard, so nothing
 * a visitor sends reaches other visitors unreviewed.
 */
export async function POST(request: NextRequest) {
  const t = await getApiTranslations(request)
  const body = await parseJsonBody(request, referenceAttachmentSchema)
  if (!body.ok) return body.response

  try {
    const locale = parseAcceptLanguage(request.headers.get('accept-language'))
    const result = await attachProductReference(body.data, locale)

    if (result === 'unknown_product') {
      return NextResponse.json({ error: t('productNotFound') }, { status: 404 })
    }
    if (result === 'invalid_value') {
      return NextResponse.json({ error: t('referenceNeedsLetter') }, { status: 400 })
    }
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Failed to attach product reference:', error)
    return NextResponse.json({ error: t('serverError') }, { status: 500 })
  }
}
