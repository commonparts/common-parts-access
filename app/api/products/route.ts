import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchProducts, createProduct } from '@/lib/supabase/queries/products'
import { trimmedString } from '@/lib/utils/validation'

// GET /api/products - List products with optional brand/category filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId') || undefined
    const categoryId = searchParams.get('categoryId') || undefined
    const includeDescendants = searchParams.get('includeDescendants') === 'true'
    const search = searchParams.get('search') || undefined
    const limit = Number.parseInt(searchParams.get('limit') || '100', 10) || 100

    const products = await fetchProducts({ brandId, categoryId, includeDescendants, search, limit })
    return NextResponse.json({ products })
  } catch (error) {
    console.error('Failed to fetch products', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

// POST /api/products - Create a new product
export async function POST(request: NextRequest) {
  try {
    // Writes require an authenticated session (RLS also enforces this, but a
    // clean 401 beats a policy-violation 500). getUser() verifies server-side.
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const name = trimmedString(body.name)
    const brandId = trimmedString(body.brandId)
    const categoryId = trimmedString(body.categoryId)
    const description = typeof body.description === 'string' ? body.description : undefined
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : undefined
    const discontinued = Boolean(body.discontinued)

    const releaseYear = body.releaseYear !== undefined && body.releaseYear !== null
      ? Number.parseInt(String(body.releaseYear), 10)
      : null

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    if (!brandId) return NextResponse.json({ error: 'Brand is required' }, { status: 400 })
    if (!categoryId) return NextResponse.json({ error: 'Category is required' }, { status: 400 })

    const product = await createProduct({
      name,
      brandId,
      categoryId,
      description,
      releaseYear: Number.isNaN(releaseYear as number) ? null : releaseYear,
      imageUrl,
      discontinued,
    })

    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    console.error('Failed to create product', error)
    const message = error instanceof Error ? error.message : 'Failed to create product'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}