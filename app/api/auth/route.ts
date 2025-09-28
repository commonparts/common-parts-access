import { NextRequest, NextResponse } from 'next/server'

// GET /api/auth
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Auth API endpoint' })
}