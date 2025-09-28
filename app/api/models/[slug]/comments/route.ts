import { NextRequest, NextResponse } from 'next/server'

// GET /api/models/[id]/comments - Get model comments
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // TODO: Implement get comments
  return NextResponse.json({ message: `Get comments for model ${params.id}`, comments: [] })
}

// POST /api/models/[id]/comments - Create comment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // TODO: Implement create comment
  const body = await request.json()
  return NextResponse.json({ message: `Create comment for model ${params.id}`, comment: body })
}