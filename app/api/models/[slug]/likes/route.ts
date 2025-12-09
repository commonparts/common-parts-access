import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addLike, getLikeState, removeLike } from '@/lib/supabase/queries/model-metrics'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
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
    if ((error as any)?.code === 'MODEL_NOT_FOUND' || (error as Error).message === 'MODEL_NOT_FOUND') {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }
    console.error('Like status error:', error)
    return NextResponse.json({ error: 'Failed to fetch like status' }, { status: 500 })
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient()
    const { slug } = await params
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const result = await addLike(slug, user.id)

    return NextResponse.json({
      liked: true,
      likes: result.likes
    })
  } catch (error) {
    if ((error as any)?.code === 'MODEL_NOT_FOUND' || (error as Error).message === 'MODEL_NOT_FOUND') {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }
    console.error('Like creation error:', error)
    return NextResponse.json({ error: 'Failed to like model' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient()
    const { slug } = await params
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const result = await removeLike(slug, user.id)

    return NextResponse.json({
      liked: false,
      likes: result.likes
    })
  } catch (error) {
    if ((error as any)?.code === 'MODEL_NOT_FOUND' || (error as Error).message === 'MODEL_NOT_FOUND') {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }
    console.error('Like deletion error:', error)
    return NextResponse.json({ error: 'Failed to unlike model' }, { status: 500 })
  }
}
