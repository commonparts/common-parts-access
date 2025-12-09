import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import crypto from 'crypto'
import { getCurrentUser } from '@/lib/supabase/queries/auth.server'
import { recordModelDownload } from '@/lib/supabase/queries/model-metrics'

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
    
    // Get client IP and user agent for analytics
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || ''
    const forwardedFor = headersList.get('x-forwarded-for')
    const clientIp = forwardedFor?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown'
    const ipHash = hashFingerprint(clientIp, userAgent)

    // Get current user if authenticated
    const { data: { user } } = await getCurrentUser()

    const download = await recordModelDownload({
      slug,
      fileId,
      userId: user?.id,
      ipHash,
      userAgent,
    })

    return NextResponse.json({
      success: true,
      message: 'Download tracked successfully',
      modelName: download.modelName,
      filename: filename
    })

  } catch (error) {
    if ((error as any)?.code === 'MODEL_NOT_FOUND' || (error as Error).message === 'MODEL_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Model not found' },
        { status: 404 }
      )
    }
    console.error('Download tracking error:', error)
    // Return success even if tracking fails - don't block the download
    return NextResponse.json({
      success: true,
      message: 'Download initiated (tracking unavailable)'
    })
  }
}