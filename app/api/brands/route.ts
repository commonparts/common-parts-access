import { NextRequest, NextResponse } from 'next/server'
import { fetchBrands } from '@/lib/supabase/queries/brands'

// GET /api/brands - List brands ordered by name
export async function GET(_request: NextRequest) {
  try {
    const brands = await fetchBrands()
    return NextResponse.json({ brands })
  } catch (error) {
    console.error('Failed to fetch brands', error)
    return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 })
  }
}