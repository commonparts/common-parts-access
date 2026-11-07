import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deletePart } from '@/lib/supabase/queries/part'
import { isValidSlug } from '@/lib/utils/slug'
import { getApiTranslations } from '@/lib/api/translations'

// DELETE /api/parts/[slug] - Delete part (authenticated owner only)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const t = await getApiTranslations(request)
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: t('signInRequired') }, { status: 401 })
    }

    const { slug } = await context.params
    if (!isValidSlug(slug)) {
      return NextResponse.json({ error: t('invalidSlug') }, { status: 400 })
    }

    await deletePart(slug, user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'PART_NOT_FOUND') {
        return NextResponse.json({ error: t('partNotFound') }, { status: 404 })
      }
      if (error.message === 'FORBIDDEN') {
        return NextResponse.json({ error: t('forbidden') }, { status: 403 })
      }
    }
    console.error('Failed to delete part:', error)
    return NextResponse.json({ error: t('serverError') }, { status: 500 })
  }
}
