import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const RECENT_WINDOW_MINUTES = 30

function hashFingerprint(ip: string, userAgent: string) {
  return crypto.createHash('sha256').update(`${ip}::${userAgent}`).digest('hex')
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient()
    const { slug } = await params
    const { data: { user } } = await supabase.auth.getUser()

    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || ''
    const forwardedFor = headersList.get('x-forwarded-for')
    const clientIp = forwardedFor?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown'
    const ipHash = hashFingerprint(clientIp, userAgent)

    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('id, view_count, status')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (modelError || !model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 })
    }

    // Throttle: skip if the same user/IP viewed within the recent window
    const since = new Date(Date.now() - RECENT_WINDOW_MINUTES * 60 * 1000).toISOString()
    const { data: recentView, error: recentError } = await supabase
      .from('model_views')
      .select('id')
      .eq('model_id', model.id)
      .or(
        user
          ? `user_id.eq.${user.id}`
          : `user_id.is.null,ip_hash.eq.${ipHash}`
      )
      .gte('viewed_at', since)
      .maybeSingle()

    if (recentError && recentError.code !== 'PGRST116') {
      console.error('Error checking recent views:', recentError)
    }

    if (!recentView) {
      const { error: insertError } = await supabase
        .from('model_views')
        .insert({
          model_id: model.id,
          user_id: user?.id ?? null,
          ip_hash: ipHash,
          user_agent: userAgent
        })

      if (insertError) {
        console.error('Failed to record view:', insertError)
      }
    }

    const estimatedViews = (model.view_count ?? 0) + (recentView ? 0 : 1)

    return NextResponse.json({ success: true, views: estimatedViews })
  } catch (error) {
    console.error('View tracking error:', error)
    return NextResponse.json({ error: 'Failed to track view' }, { status: 500 })
  }
}
