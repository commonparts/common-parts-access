import { NextResponse } from 'next/server'

// GET /api/collections - List collections
export async function GET() {
  return NextResponse.json(
    {
      error: 'Not implemented',
      message:
        'Collection listing is not implemented yet. Track this work in a GitHub issue.',
    },
    { status: 501 },
  )
}

// POST /api/collections - Create collection
export async function POST() {
  return NextResponse.json(
    {
      error: 'Not implemented',
      message:
        'Collection creation is not implemented yet. Track this work in a GitHub issue.',
    },
    { status: 501 },
  )
}