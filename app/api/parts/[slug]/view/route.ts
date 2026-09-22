import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { recordPartView } from '@/lib/supabase/queries/part-metrics'
import { isPartNotFoundError } from '@/lib/utils/errors'

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
    const { slug } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || ''
    const forwardedFor = headersList.get('x-forwarded-for')
    const clientIp = forwardedFor?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown'
    const ipHash = hashFingerprint(clientIp, userAgent)

    const result = await recordPartView({
      slug,
      userId: user?.id,
      ipHash,
      userAgent,
      throttleMinutes: RECENT_WINDOW_MINUTES,
    })

    return NextResponse.json({ success: true, views: result.estimatedViews })
  } catch (error) {
    if (isPartNotFoundError(error)) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 })
    }
    console.error('View tracking error:', error)
    return NextResponse.json({ error: 'Failed to track view' }, { status: 500 })
  }
}
