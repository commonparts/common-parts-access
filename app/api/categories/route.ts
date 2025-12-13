import { NextRequest, NextResponse } from 'next/server'
import { fetchCategoriesTree } from '@/lib/supabase/queries/categories'

// GET /api/categories - Hierarchical list ordered by path
export async function GET(_request: NextRequest) {
  try {
    const categories = await fetchCategoriesTree()
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Failed to fetch categories', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}