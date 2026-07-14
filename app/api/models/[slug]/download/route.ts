import { NextRequest, NextResponse } from 'next/server'
import { recordModelDownload } from '@/lib/supabase/queries/model-metrics'
import { isModelNotFoundError } from '@/lib/utils/errors'
import { isValidUuid } from '@/lib/utils/validation'

export const runtime = 'nodejs'

// POST /api/models/[slug]/download - Increment the anonymous download counter.
// No account, cookie, or fingerprint is required or recorded (issue #250).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  try {
    const fileId =
      typeof body === 'object' && body !== null && 'fileId' in body
        ? (body as { fileId: unknown }).fileId
        : null

    if (typeof fileId !== 'string' || !isValidUuid(fileId)) {
      return NextResponse.json(
        { error: 'Invalid fileId: expected a UUID' },
        { status: 400 }
      )
    }

    const { slug } = await params
    const download = await recordModelDownload({ slug, fileId })

    return NextResponse.json({
      success: true,
      message: 'Download counted',
      modelName: download.modelName,
    })
  } catch (error) {
    if (isModelNotFoundError(error)) {
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
