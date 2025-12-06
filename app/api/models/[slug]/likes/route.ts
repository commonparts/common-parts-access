import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

async function fetchModel(supabase: SupabaseServerClient, slug: string) {
  const result = await supabase
    .from('models')
    .select('id, like_count')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  return result
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient()
    const { slug } = await params
    const { data: model, error: modelError } = await fetchModel(supabase, slug)

    if (modelError || !model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    const { data: { user } } = await supabase.auth.getUser()

    let viewerHasLiked = false
    if (user) {
      const { data: likeRow, error: likeError } = await supabase
        .from('model_likes')
        .select('id')
        .eq('model_id', model.id)
        .eq('user_id', user.id)
        .maybeSingle()

      if (likeError && likeError.code !== 'PGRST116') {
        console.error('Error checking like status:', likeError)
      }

      viewerHasLiked = Boolean(likeRow)
    }

    return NextResponse.json({
      likes: model.like_count || 0,
      liked: viewerHasLiked
    })
  } catch (error) {
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

    const { data: model, error: modelError } = await fetchModel(supabase, slug)

    if (modelError || !model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    const baseLikes = model.like_count || 0

    const { data: existingLike, error: existingLikeError } = await supabase
      .from('model_likes')
      .select('id')
      .eq('model_id', model.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingLikeError && existingLikeError.code !== 'PGRST116') {
      console.error('Failed to check existing like:', existingLikeError)
      return NextResponse.json({ error: 'Failed to like model' }, { status: 500 })
    }

    if (existingLike) {
      return NextResponse.json({ liked: true, likes: baseLikes })
    }

    const { error: insertError } = await supabase
      .from('model_likes')
      .insert({
        model_id: model.id,
        user_id: user.id
      })

    if (insertError) {
      console.error('Failed to insert like:', insertError)
      return NextResponse.json({ error: 'Failed to like model' }, { status: 500 })
    }

    return NextResponse.json({
      liked: true,
      likes: baseLikes + 1
    })
  } catch (error) {
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

    const { data: model, error: modelError } = await fetchModel(supabase, slug)

    if (modelError || !model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    const baseLikes = model.like_count || 0

    const { data: existingLike, error: existingLikeError } = await supabase
      .from('model_likes')
      .select('id')
      .eq('model_id', model.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingLikeError && existingLikeError.code !== 'PGRST116') {
      console.error('Failed to check existing like:', existingLikeError)
      return NextResponse.json({ error: 'Failed to unlike model' }, { status: 500 })
    }

    if (!existingLike) {
      return NextResponse.json({ liked: false, likes: baseLikes })
    }

    const { error: deleteError } = await supabase
      .from('model_likes')
      .delete()
      .eq('id', existingLike.id)

    if (deleteError) {
      console.error('Failed to delete like:', deleteError)
      return NextResponse.json({ error: 'Failed to unlike model' }, { status: 500 })
    }

    return NextResponse.json({
      liked: false,
      likes: Math.max(0, baseLikes - 1)
    })
  } catch (error) {
    console.error('Like deletion error:', error)
    return NextResponse.json({ error: 'Failed to unlike model' }, { status: 500 })
  }
}
