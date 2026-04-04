import { NextRequest, NextResponse } from 'next/server'

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

// DELETE /api/models/[slug] - Delete model
// Not yet implemented — tracked in GitHub issues
export async function DELETE(
  _request: NextRequest,
  _context: { params: Promise<{ slug: string }> }
) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}