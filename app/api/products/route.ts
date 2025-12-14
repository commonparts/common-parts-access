import { NextRequest, NextResponse } from 'next/server'
import { fetchProducts } from '@/lib/supabase/queries/products'

// GET /api/products - List products with optional brand/category filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId') || undefined
    const categoryId = searchParams.get('categoryId') || undefined
    const search = searchParams.get('search') || undefined
    const limit = Number.parseInt(searchParams.get('limit') || '100', 10) || 100

    const products = await fetchProducts({ brandId, categoryId, search, limit })
    return NextResponse.json({ products })
  } catch (error) {
    console.error('Failed to fetch products', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}