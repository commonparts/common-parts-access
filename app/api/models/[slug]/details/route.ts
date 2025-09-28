import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/models/[slug]/details - Get detailed model information by slug
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const supabase = await createClient()
    
    // Get model details with all related data
    const { data: model, error } = await supabase
      .from('models')
      .select(`
        id,
        name,
        slug,
        description,
        part_name,
        part_number,
        material,
        color,
        dimensions,
        print_settings,
        estimated_print_time,
        estimated_material_usage,
        thumbnail_url,
        images,
        download_count,
        view_count,
        like_count,
        tags,
        license,
        instructions,
        notes,
        created_at,
        updated_at,
        user_profiles!inner(
          id,
          username,
          display_name,
          bio,
          avatar_url,
          website_url,
          location,
          reputation_score,
          verified_maker,
          created_at
        ),
        products(
          id,
          name,
          slug,
          model_number,
          description,
          release_year,
          discontinued,
          image_url,
          brands(
            id,
            name,
            slug,
            description,
            logo_url,
            website_url,
            verified
          )
        ),
        categories(
          id,
          name,
          slug,
          description,
          icon,
          path
        ),
        brands(
          id,
          name,
          slug,
          description,
          logo_url,
          website_url,
          verified
        )
      `)
      .eq('slug', params.slug)
      .eq('status', 'published')
      .single()

    if (error) {
      console.error('Error fetching model:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Model not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to fetch model' },
        { status: 500 }
      )
    }

    // Get model files
    const { data: files, error: filesError } = await supabase
      .from('model_files')
      .select('*')
      .eq('model_id', model.id)
      .order('created_at', { ascending: true })

    if (filesError) {
      console.error('Error fetching model files:', filesError)
    }

    // Get recent comments (limited to 10 for initial load)
    const { data: comments, error: commentsError } = await supabase
      .from('model_comments')
      .select(`
        id,
        content,
        rating,
        created_at,
        updated_at,
        user_profiles(
          username,
          display_name,
          avatar_url,
          verified_maker
        )
      `)
      .eq('model_id', model.id)
      .is('parent_id', null) // Only top-level comments for now
      .order('created_at', { ascending: false })
      .limit(10)

    if (commentsError) {
      console.error('Error fetching comments:', commentsError)
    }

    // Transform the data
    const userProfile = Array.isArray(model.user_profiles) ? model.user_profiles[0] : model.user_profiles
    const product = Array.isArray(model.products) ? model.products[0] : model.products
    const category = Array.isArray(model.categories) ? model.categories[0] : model.categories
    const brand = Array.isArray(model.brands) ? model.brands[0] : model.brands

    const transformedModel = {
      id: model.id,
      slug: model.slug,
      name: model.name,
      description: model.description,
      partDetails: {
        partName: model.part_name,
        partNumber: model.part_number,
        material: model.material,
        color: model.color,
        dimensions: model.dimensions
      },
      printSettings: model.print_settings,
      estimatedPrintTime: model.estimated_print_time,
      estimatedMaterialUsage: model.estimated_material_usage,
      thumbnailUrl: model.thumbnail_url,
      images: model.images || [],
      stats: {
        downloads: model.download_count || 0,
        likes: model.like_count || 0,
        views: model.view_count || 0
      },
      tags: model.tags || [],
      license: model.license,
      instructions: model.instructions,
      notes: model.notes,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
      author: userProfile ? {
        id: userProfile.id,
        username: userProfile.username,
        displayName: userProfile.display_name,
        bio: userProfile.bio,
        avatar: userProfile.avatar_url,
        website: userProfile.website_url,
        location: userProfile.location,
        reputationScore: userProfile.reputation_score,
        verifiedMaker: userProfile.verified_maker,
        memberSince: userProfile.created_at
      } : null,
      product: product ? {
        id: product.id,
        name: product.name,
        slug: product.slug,
        modelNumber: product.model_number,
        description: product.description,
        releaseYear: product.release_year,
        discontinued: product.discontinued,
        image: product.image_url,
        brand: product.brands ? (() => {
          const productBrand = Array.isArray(product.brands) ? product.brands[0] : product.brands
          return {
            id: productBrand.id,
            name: productBrand.name,
            slug: productBrand.slug,
            description: productBrand.description,
            logo: productBrand.logo_url,
            website: productBrand.website_url,
            verified: productBrand.verified
          }
        })() : null
      } : null,
      category: category ? {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        path: category.path
      } : null,
      brand: brand ? {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        description: brand.description,
        logo: brand.logo_url,
        website: brand.website_url,
        verified: brand.verified
      } : null,
      files: files || [],
      comments: comments?.map(comment => {
        const commentAuthor = Array.isArray(comment.user_profiles) ? comment.user_profiles[0] : comment.user_profiles
        return {
          id: comment.id,
          content: comment.content,
          rating: comment.rating,
          createdAt: comment.created_at,
          updatedAt: comment.updated_at,
          author: commentAuthor ? {
            username: commentAuthor.username,
            displayName: commentAuthor.display_name,
            avatar: commentAuthor.avatar_url,
            verifiedMaker: commentAuthor.verified_maker
          } : null
        }
      }) || []
    }

    return NextResponse.json({ model: transformedModel })
  } catch (error) {
    console.error('Unexpected error fetching model details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}