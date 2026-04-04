import { NextRequest, NextResponse } from 'next/server'

// GET /api/models/[slug]/files - List model files
// Not yet implemented — tracked in GitHub issues
export async function GET(
  _request: NextRequest,
  _context: { params: Promise<{ slug: string }> }
) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}

// POST /api/models/[slug]/files - Upload model file
// Not yet implemented — tracked in GitHub issues
export async function POST(
  _request: NextRequest,
  _context: { params: Promise<{ slug: string }> }
) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 })
}