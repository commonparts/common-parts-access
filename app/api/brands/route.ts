import { NextResponse } from 'next/server'
import { fetchBrands } from '@/lib/supabase/queries/brands'
import { getApiTranslations } from '@/lib/api/translations'

// GET /api/brands - List brands ordered by name
export async function GET(request: Request) {
  const t = await getApiTranslations(request)
  try {
    const brands = await fetchBrands()
    return NextResponse.json({ brands })
  } catch (error) {
    console.error('Failed to fetch brands', error)
    return NextResponse.json({ error: t('loadFailed') }, { status: 500 })
  }
}