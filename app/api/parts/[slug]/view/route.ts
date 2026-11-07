import { NextResponse } from 'next/server'
import { recordPartView } from '@/lib/supabase/queries/part-metrics'
import { isPartNotFoundError } from '@/lib/utils/errors'
import { isValidSlug } from '@/lib/utils/slug'
import { getApiTranslations } from '@/lib/api/translations'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const t = await getApiTranslations(request)
  try {
    const { slug } = await params
    if (!isValidSlug(slug)) {
      return NextResponse.json({ error: t('invalidSlug') }, { status: 400 })
    }

    await recordPartView(slug)

    return NextResponse.json({ success: true })
  } catch (error) {
    if (isPartNotFoundError(error)) {
      return NextResponse.json({ error: t('partNotFound') }, { status: 404 })
    }
    console.error('View tracking error:', error)
    return NextResponse.json({ error: t('trackingFailed') }, { status: 500 })
  }
}
