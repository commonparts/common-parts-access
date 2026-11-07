import { NextRequest, NextResponse } from 'next/server'
import { parseSearchParams } from '@/lib/api/parse'
import { localeQuerySchema } from '@/lib/schemas/common'
import { fetchCategoriesTree } from '@/lib/supabase/queries/categories'
import { getApiTranslations } from '@/lib/api/translations'

// GET /api/categories?locale= - Hierarchical list ordered by path, named in the locale
export async function GET(request: NextRequest) {
  const t = await getApiTranslations(request)
  try {
    const query = await parseSearchParams(request, localeQuerySchema)
    if (!query.ok) return query.response
    const categories = await fetchCategoriesTree(query.data.locale)
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('Failed to fetch categories', error)
    return NextResponse.json({ error: t('loadFailed') }, { status: 500 })
  }
}