import { NextRequest, NextResponse } from 'next/server'

// GET /api/brands - List all brands
export async function GET(_request: NextRequest) {
  // TODO: Implement brand listing
  return NextResponse.json({ message: 'Brands API endpoint', brands: [] })
}

// POST /api/brands - Create brand
export async function POST(request: NextRequest) {
  // TODO: Implement brand creation
  const body = await request.json()
  return NextResponse.json({ message: 'Brand created', brand: body }, { status: 201 })
}