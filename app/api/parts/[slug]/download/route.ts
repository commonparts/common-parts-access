import { NextRequest, NextResponse } from 'next/server'
import { recordPartDownload } from '@/lib/supabase/queries/part-metrics'
import { isPartNotFoundError } from '@/lib/utils/errors'
import { parseJsonBody } from '@/lib/api/parse'
import { downloadSchema } from '@/lib/schemas/parts'

export const runtime = 'nodejs'

// POST /api/parts/[slug]/download - Record an anonymous download row.
// No account, cookie, or fingerprint is required or recorded (issue #250).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const body = await parseJsonBody(request, downloadSchema, 'Invalid JSON body')
  if (!body.ok) return body.response

  try {
    const { slug } = await params
    const download = await recordPartDownload({ slug, fileId: body.data.fileId })

    return NextResponse.json({
      success: true,
      message: 'Download counted',
      partName: download.partName,
    })
  } catch (error) {
    if (isPartNotFoundError(error)) {
      return NextResponse.json(
        { error: 'Part not found' },
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
