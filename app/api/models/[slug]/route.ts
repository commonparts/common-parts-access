import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteModel } from '@/lib/supabase/queries/model'

// GET /api/models/[slug] - Get model by slug
// Not yet implemented — tracked in GitHub issues
export async function GET(
  _request: NextRequest,
  _context: { params: Promise<{ slug: string }> }
) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

// PUT /api/models/[slug] - Update model
// Not yet implemented — tracked in GitHub issues
export async function PUT(
  _request: NextRequest,
  _context: { params: Promise<{ slug: string }> }
) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

// DELETE /api/models/[slug] - Delete model (authenticated owner only)
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { slug } = await context.params
    await deleteModel(slug, user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Model not found') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      if (error.message === 'Forbidden') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
    console.error('Failed to delete model:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
