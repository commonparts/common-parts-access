import { NextRequest, NextResponse } from 'next/server'
import { fetchPartCards } from '@/lib/supabase/queries/part'
import type { PartListOptions } from '@/types/parts'

// GET /api/parts - List all parts with pagination, sorting, and search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortByParam = searchParams.get('sortBy') || 'created_at'
    const allowedSort: PartListOptions['sortBy'][] = ['popularity', 'likes', 'views', 'newest', 'created_at']
    const sortBy = allowedSort.includes(sortByParam as PartListOptions['sortBy'])
      ? (sortByParam as PartListOptions['sortBy'])
      : 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const search = searchParams.get('search') || ''
    const productId = searchParams.get('productId') || undefined
    const brandId = searchParams.get('brandId') || undefined
    const categoryId = searchParams.get('categoryId') || undefined

    const { parts, pagination } = await fetchPartCards({
      page,
      limit,
      sortBy,
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
      search,
      product: productId,
      brand: brandId,
      category: categoryId,
      status: 'published',
    })

    // The payload key stays `parts`: this route and its siblings under
    // /api/parts still speak the database's vocabulary. Only the card layer
    // was renamed to "part".
    return NextResponse.json({
      parts: parts,
      pagination,
    })
  } catch (error) {
    console.error('Unexpected error fetching parts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/parts - Create new part
export async function POST(request: NextRequest) {
  // TODO: Implement part creation
  const body = await request.json()
  return NextResponse.json({ message: 'Part created', part: body }, { status: 201 })
}