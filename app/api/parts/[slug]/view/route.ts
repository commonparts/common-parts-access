import { NextResponse } from 'next/server'
import { recordPartView } from '@/lib/supabase/queries/part-metrics'
import { isPartNotFoundError } from '@/lib/utils/errors'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const result = await recordPartView(slug)

    return NextResponse.json({ success: true, views: result.estimatedViews })
  } catch (error) {
    if (isPartNotFoundError(error)) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 })
    }
    console.error('View tracking error:', error)
    return NextResponse.json({ error: 'Failed to track view' }, { status: 500 })
  }
}
