import { NextRequest, NextResponse } from 'next/server'
import { parseSearchParams } from '@/lib/api/parse'
import { partListQuerySchema } from '@/lib/schemas/parts'
import { fetchPartCards } from '@/lib/supabase/queries/part'

// GET /api/parts - List all parts with pagination, sorting, and search
export async function GET(request: NextRequest) {
  try {
    const query = parseSearchParams(request.nextUrl.searchParams, partListQuerySchema)
    if (!query.ok) return query.response
    const { page, limit, sortBy, sortOrder, search, productId, brandId, categoryId } = query.data

    const { parts, pagination } = await fetchPartCards({
      page,
      limit,
      sortBy,
      sortOrder,
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
