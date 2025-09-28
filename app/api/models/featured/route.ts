import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/models/featured - Get the most downloaded models
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the 8 most downloaded models with their associated data
    const { data: models, error } = await supabase
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
      `)
      .eq('status', 'published')
      .order('download_count', { ascending: false })
      .limit(8)

    if (error) {
      console.error('Error fetching featured models:', error)
      return NextResponse.json(
        { error: 'Failed to fetch featured models' },
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
        isPremium: false // You can add this logic based on your business rules
      }
    }) || []

    return NextResponse.json({ 
      models: transformedModels,
      total: transformedModels.length
    })
  } catch (error) {
    console.error('Unexpected error fetching featured models:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}