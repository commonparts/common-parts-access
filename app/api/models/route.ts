import { NextRequest, NextResponse } from 'next/server'
import { fetchModelCards } from '@/lib/supabase/queries/model'

// GET /api/models - List all models with pagination, sorting, and search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const search = searchParams.get('search') || ''

    const { models, pagination } = await fetchModelCards({
      page,
      limit,
      sortBy: sortBy as any,
      sortOrder: sortOrder === 'asc' ? 'asc' : 'desc',
      search,
      status: 'published',
    })

    return NextResponse.json({ 
      models,
      pagination
    })
  } catch (error) {
    console.error('Unexpected error fetching models:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/models - Create new model
export async function POST(request: NextRequest) {
  // TODO: Implement model creation
  const body = await request.json()
  return NextResponse.json({ message: 'Model created', model: body }, { status: 201 })
}