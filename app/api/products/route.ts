import { NextRequest, NextResponse } from 'next/server'

// GET /api/products - List all products
export async function GET(request: NextRequest) {
  // TODO: Implement product listing
  return NextResponse.json({ message: 'Products API endpoint', products: [] })
}

// POST /api/products - Create product
export async function POST(request: NextRequest) {
  // TODO: Implement product creation
  const body = await request.json()
  return NextResponse.json({ message: 'Product created', product: body }, { status: 201 })
}