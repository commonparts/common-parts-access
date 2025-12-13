import { NextRequest, NextResponse } from 'next/server'

// GET /api/users - List users (admin only)
export async function GET(_request: NextRequest) {
  // TODO: Implement user listing (admin only)
  return NextResponse.json({ message: 'Users API endpoint' })
}

// POST /api/users - Create user
export async function POST(request: NextRequest) {
  // TODO: Implement user creation
  const body = await request.json()
  return NextResponse.json({ message: 'User created', user: body }, { status: 201 })
}