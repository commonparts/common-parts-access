import { NextRequest, NextResponse } from 'next/server'

// GET /api/categories - List all categories
export async function GET(request: NextRequest) {
  // TODO: Implement category listing
  return NextResponse.json({ message: 'Categories API endpoint', categories: [] })
}

// POST /api/categories - Create category
export async function POST(request: NextRequest) {
  // TODO: Implement category creation
  const body = await request.json()
  return NextResponse.json({ message: 'Category created', category: body }, { status: 201 })
}