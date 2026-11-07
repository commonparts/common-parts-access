import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addLike, getLikeState, removeLike } from '@/lib/supabase/queries/part-metrics'
import { isPartNotFoundError } from '@/lib/utils/errors'
import { getApiTranslations } from '@/lib/api/translations'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const t = await getApiTranslations(request)
  try {
    const supabase = await createClient()
    const { slug } = await params
    const { data: { user } } = await supabase.auth.getUser()
    const likeState = await getLikeState(slug, user?.id)

    return NextResponse.json({
      likes: likeState.likes,
      liked: likeState.liked
    })
  } catch (error) {
    if (isPartNotFoundError(error)) {
      return NextResponse.json({ error: t('partNotFound') }, { status: 404 })
    }
    console.error('Like status error:', error)
    return NextResponse.json({ error: t('loadFailed') }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const t = await getApiTranslations(request)
  try {
    const supabase = await createClient()
    const { slug } = await params
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t('signInRequired') }, { status: 401 })
    }

    const result = await addLike(slug, user.id)

    return NextResponse.json({
      liked: true,
      likes: result.likes
    })
  } catch (error) {
    if (isPartNotFoundError(error)) {
      return NextResponse.json({ error: t('partNotFound') }, { status: 404 })
    }
    console.error('Like creation error:', error)
    return NextResponse.json({ error: t('likeFailed') }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const t = await getApiTranslations(request)
  try {
    const supabase = await createClient()
    const { slug } = await params
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: t('signInRequired') }, { status: 401 })
    }

    const result = await removeLike(slug, user.id)

    return NextResponse.json({
      liked: false,
      likes: result.likes
    })
  } catch (error) {
    if (isPartNotFoundError(error)) {
      return NextResponse.json({ error: t('partNotFound') }, { status: 404 })
    }
    console.error('Like deletion error:', error)
    return NextResponse.json({ error: t('likeFailed') }, { status: 500 })
  }
}
