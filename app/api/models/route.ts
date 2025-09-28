import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/models - List all models with pagination, sorting, and search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const search = searchParams.get('search') || ''
    
    const supabase = await createClient()
    
    // Build the query
    let query = supabase
      .from('models')
      .select(`
        id,
        name,
        slug,
        description,
        thumbnail_url,
        download_count,
        like_count,
        view_count,
        tags,
        created_at,
        user_profiles!inner(
          username,
          display_name,
          avatar_url
        ),
        products(
          name
        ),
        categories(
          name,
          slug
        )
      `, { count: 'exact' })
      .eq('status', 'published')

    // Add search filter if provided
    if (search.trim()) {
      query = query.ilike('name', `%${search.trim()}%`)
    }

    // Add sorting
    let orderColumn = sortBy
    if (sortBy === 'popularity') {
      orderColumn = 'download_count'
    } else if (sortBy === 'likes') {
      orderColumn = 'like_count'
    } else if (sortBy === 'views') {
      orderColumn = 'view_count'
    } else if (sortBy === 'newest') {
      orderColumn = 'created_at'
    }

    query = query.order(orderColumn, { ascending: sortOrder === 'asc' })

    // Add pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data: models, error, count } = await query

    if (error) {
      console.error('Error fetching models:', error)
      return NextResponse.json(
        { error: 'Failed to fetch models' },
        { status: 500 }
      )
    }

    // Transform the data to match the ModelGrid interface
    const transformedModels = models?.map(model => {
      const userProfile = Array.isArray(model.user_profiles) ? model.user_profiles[0] : model.user_profiles;
      const category = Array.isArray(model.categories) ? model.categories[0] : model.categories;
      
      return {
        id: model.id,
        slug: model.slug,
        title: model.name,
        description: model.description,
        thumbnailUrl: model.thumbnail_url,
        author: {
          username: userProfile?.username || 'Unknown',
          avatar: userProfile?.avatar_url
        },
        stats: {
          downloads: model.download_count || 0,
          likes: model.like_count || 0,
          views: model.view_count || 0
        },
        tags: model.tags || [],
        category: category?.name || 'Uncategorized',
        createdAt: new Date(model.created_at),
        isPremium: false
      }
    }) || []

    const totalPages = Math.ceil((count || 0) / limit)

    return NextResponse.json({ 
      models: transformedModels,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
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