import { NextRequest, NextResponse } from 'next/server'
import { recordPartSourceClick } from '@/lib/supabase/queries/part-metrics'
import { isPartNotFoundError } from '@/lib/utils/errors'
import { isValidSlug } from '@/lib/utils/slug'
import { isSourceClickContext, SOURCE_CLICK_CONTEXTS } from '@/lib/utils/source-clicks'

// POST /api/parts/[slug]/source-click - Record an anonymous click on the
// part's source link (issue #375). Body: { context: 'part_page' | 'card' }.
// No account, cookie, or fingerprint is required or recorded.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  if (!isValidSlug(slug)) {
    return NextResponse.json({ error: 'Invalid slug' }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const context =
    typeof body === 'object' && body !== null && 'context' in body
      ? (body as { context: unknown }).context
      : null

  if (!isSourceClickContext(context)) {
    return NextResponse.json(
      { error: `Invalid context: expected one of ${SOURCE_CLICK_CONTEXTS.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    await recordPartSourceClick(slug, context)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (isPartNotFoundError(error)) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 })
    }
    console.error('Source click tracking error:', error)
    return NextResponse.json({ error: 'Failed to track source click' }, { status: 500 })
  }
}
