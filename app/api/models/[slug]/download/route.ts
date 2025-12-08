import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/queries/auth.server'

export const runtime = 'nodejs'

function hashFingerprint(ip: string, userAgent: string) {
  return crypto.createHash('sha256').update(`${ip}::${userAgent}`).digest('hex')
}

interface DownloadTrackingData {
  fileId: string
  filename: string
}

// POST /api/models/[slug]/download - Track model download
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const body: DownloadTrackingData = await request.json()
    const { fileId, filename } = body
    const { slug } = await params
    const supabase = await createClient()
    
    // Get client IP and user agent for analytics
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || ''
    const forwardedFor = headersList.get('x-forwarded-for')
    const clientIp = forwardedFor?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown'
    const ipHash = hashFingerprint(clientIp, userAgent)

    // Get current user if authenticated
    const { data: { user } } = await getCurrentUser()

    // Find the model by slug
    const { data: model, error: modelError } = await supabase
      .from('models')
      .select('id, name, download_count')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (modelError || !model) {
      console.error('Model not found:', modelError)
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      )
    }

    const downloadRecord = {
      model_id: model.id,
      file_id: fileId,
      user_id: user?.id || null,
      ip_hash: ipHash,
      user_agent: userAgent,
      downloaded_at: new Date().toISOString()
    }

    const { error: trackingError } = await supabase
      .from('model_downloads')
      .insert(downloadRecord)

    if (trackingError) {
      console.error('Failed to record download:', trackingError)
    }

    return NextResponse.json({
      success: true,
      message: 'Download tracked successfully',
      modelName: model.name,
      filename: filename
    })

  } catch (error) {
    console.error('Download tracking error:', error)
    // Return success even if tracking fails - don't block the download
    return NextResponse.json({
      success: true,
      message: 'Download initiated (tracking unavailable)'
    })
  }
}