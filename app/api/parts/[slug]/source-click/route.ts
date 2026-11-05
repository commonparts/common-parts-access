import { NextRequest, NextResponse } from 'next/server'
import { recordPartSourceClick } from '@/lib/supabase/queries/part-metrics'
import { isPartNotFoundError } from '@/lib/utils/errors'
import { isValidSlug } from '@/lib/utils/slug'
import { parseJsonBody } from '@/lib/api/parse'
import { sourceClickSchema } from '@/lib/schemas/parts'

/**
 * POST /api/parts/[slug]/source-click - Records an anonymous click on the
 * part's source link (issue #375). Body: { context: 'part_page' | 'card' }.
 * No account, cookie, or fingerprint is required or recorded: the route is
 * public, like the view and download routes, and the RLS insert policy only
 * accepts published parts. Answers 400 on an invalid slug, body or context,
 * 404 when the part is missing or unpublished.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
  }

  const body = await parseJsonBody(request, sourceClickSchema, 'Invalid JSON body')
  if (!body.ok) return body.response

  try {
    await recordPartSourceClick(slug, body.data.context)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (isPartNotFoundError(error)) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 })
    }
    console.error('Source click tracking error:', error)
    return NextResponse.json({ error: 'Failed to track source click' }, { status: 500 })
  }
}
