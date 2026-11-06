import { NextRequest, NextResponse } from 'next/server'
import { parseSearchParams } from '@/lib/api/parse'
import { localeQuerySchema } from '@/lib/schemas/common'
import { fetchCategoriesTree } from '@/lib/supabase/queries/categories'

// GET /api/categories?locale= - Hierarchical list ordered by path, named in the locale
export async function GET(request: NextRequest) {
  try {
    const query = parseSearchParams(request.nextUrl.searchParams, localeQuerySchema)
    if (!query.ok) return query.response
    const categories = await fetchCategoriesTree(query.data.locale)
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Failed to fetch categories', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}