import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveStorageUrl } from '@/lib/storage/url'

// Supabase returns joined rows as T | T[] depending on cardinality.
// This helper normalises both shapes to a single record or null.
function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

// GET /api/models/[slug]/details - Get detailed model information by slug
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient()
    const { slug } = await params

    const [
      { data: { user } },
      { data: model, error: modelError },
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase
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
          instructions,
          notes,
          created_at,
          updated_at,
          origin_type,
          verification_status,
          source_url,
          source_platform,
          original_author,
          original_author_url,
          licenses!models_license_id_fkey(
            id,
            spdx_id,
            name,
            short_name,
            url,
            allows_redistribution,
            requires_attribution,
            allows_commercial,
            is_copyleft
          ),
          source_licenses:licenses!models_source_license_id_fkey(
            id,
            spdx_id,
            name,
            short_name,
            url,
            allows_redistribution,
            requires_attribution,
            allows_commercial,
            is_copyleft
          ),
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
        .eq('slug', slug)
        .eq('status', 'published')
        .single(),
    ])

    if (modelError) {
      if (modelError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Model not found' }, { status: 404 })
      }
      console.error('Error fetching model:', modelError)
      return NextResponse.json({ error: 'Failed to fetch model' }, { status: 500 })
    }

    const [
      { data: files, error: filesError },
      { data: comments, error: commentsError },
      { data: likeRow, error: likeError },
    ] = await Promise.all([
      supabase
        .from('model_files')
        .select('id, filename, original_filename, file_type, file_size, file_url, file_category, created_at')
        .eq('model_id', model.id)
        .order('created_at', { ascending: true }),
      supabase
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
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(10),
      user
        ? supabase
            .from('model_likes')
            .select('id')
            .eq('model_id', model.id)
            .eq('user_id', user.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ])

    if (filesError) console.error('Error fetching model files:', filesError)
    if (commentsError) console.error('Error fetching comments:', commentsError)
    if (likeError) console.error('Error checking like status:', likeError)

    const author = first(model.user_profiles)
    const product = first(model.products)
    const category = first(model.categories)
    const brand = first(model.brands)
    const license = first(model.licenses)
    const sourceLicense = first(model.source_licenses)
    const productBrand = product ? first(product.brands) : null

    return NextResponse.json({
      model: {
        id: model.id,
        slug: model.slug,
        name: model.name,
        description: model.description,
        partDetails: {
          partName: model.part_name,
          partNumber: model.part_number,
          material: model.material,
          color: model.color,
          dimensions: model.dimensions,
        },
        printSettings: model.print_settings,
        estimatedPrintTime: model.estimated_print_time,
        estimatedMaterialUsage: model.estimated_material_usage,
        thumbnailUrl: model.thumbnail_url,
        images: model.images || [],
        stats: {
          downloads: model.download_count || 0,
          likes: model.like_count || 0,
          views: model.view_count || 0,
        },
        viewerHasLiked: Boolean(likeRow),
        tags: model.tags || [],
        license: license ? {
          id: license.id,
          spdxId: license.spdx_id,
          name: license.name,
          shortName: license.short_name,
          url: license.url,
          allowsRedistribution: license.allows_redistribution,
          requiresAttribution: license.requires_attribution,
          allowsCommercial: license.allows_commercial,
          isCopyleft: license.is_copyleft,
        } : null,
        originType: model.origin_type,
        verificationStatus: model.verification_status,
        sourcePlatform: model.source_platform,
        sourceUrl: model.source_url,
        originalAuthor: model.original_author,
        originalAuthorUrl: model.original_author_url,
        sourceLicense: sourceLicense ? {
          id: sourceLicense.id,
          spdxId: sourceLicense.spdx_id,
          name: sourceLicense.name,
          shortName: sourceLicense.short_name,
          url: sourceLicense.url,
          allowsRedistribution: sourceLicense.allows_redistribution,
          requiresAttribution: sourceLicense.requires_attribution,
          allowsCommercial: sourceLicense.allows_commercial,
          isCopyleft: sourceLicense.is_copyleft,
        } : null,
        instructions: model.instructions,
        notes: model.notes,
        createdAt: model.created_at,
        updatedAt: model.updated_at,
        author: author ? {
          id: author.id,
          username: author.username,
          displayName: author.display_name,
          bio: author.bio,
          avatar: author.avatar_url,
          website: author.website_url,
          location: author.location,
          reputationScore: author.reputation_score,
          verifiedMaker: author.verified_maker,
          memberSince: author.created_at,
        } : null,
        product: product ? {
          id: product.id,
          name: product.name,
          slug: product.slug,
          modelNumber: product.model_number,
          description: product.description,
          releaseYear: product.release_year,
          discontinued: product.discontinued,
          image: resolveStorageUrl(product.image_url),
          brand: productBrand ? {
            id: productBrand.id,
            name: productBrand.name,
            slug: productBrand.slug,
            description: productBrand.description,
            logo: productBrand.logo_url,
            website: productBrand.website_url,
            verified: productBrand.verified,
          } : null,
        } : null,
        category: category ? {
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          icon: resolveStorageUrl(category.icon),
          path: category.path,
        } : null,
        brand: brand ? {
          id: brand.id,
          name: brand.name,
          slug: brand.slug,
          description: brand.description,
          logo: brand.logo_url,
          website: brand.website_url,
          verified: brand.verified,
        } : null,
        files: files || [],
        comments: (comments || []).map(comment => {
          const commentAuthor = first(comment.user_profiles)
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
              verifiedMaker: commentAuthor.verified_maker,
            } : null,
          }
        }),
      },
    })
  } catch (error) {
    console.error('Unexpected error fetching model details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}