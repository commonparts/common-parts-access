import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveStorageUrl } from '@/lib/storage/url'
import { getSourcePlatformBySlug } from '@/lib/supabase/queries/platforms'

// Supabase returns joined rows as T | T[] depending on cardinality.
// This helper normalises both shapes to a single record or null.
function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

// GET /api/parts/[slug]/details - Get detailed part information by slug
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const supabase = await createClient()
    const { slug } = await params

    const [
      { data: { user } },
      { data: part, error: partError },
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase
        .from('parts')
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
          status,
          user_id,
          verification_status,
          source_url,
          source_platform,
          file_hosting_type,
          original_author,
          original_author_url,
          licenses!parts_license_id_fkey(
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
          source_licenses:licenses!parts_source_license_id_fkey(
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
        .single(),
    ])

    if (partError) {
      if (partError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Part not found' }, { status: 404 })
      }
      console.error('Error fetching part:', partError)
      return NextResponse.json({ error: 'Failed to fetch part' }, { status: 500 })
    }

    // RLS already limits reads to published rows plus the owner's own; this
    // explicit check keeps the route correct even if policies change. Owners
    // can preview their drafts (curation review screen); everyone else 404s.
    if (part.status !== 'published' && (!user || user.id !== part.user_id)) {
      return NextResponse.json({ error: 'Part not found' }, { status: 404 })
    }

    const [
      { data: files, error: filesError },
      { data: comments, error: commentsError },
      { data: likeRow, error: likeError },
      { data: partProducts, error: partProductsError },
      platformData,
    ] = await Promise.all([
      supabase
        .from('part_files')
        .select('id, filename, original_filename, file_type, file_size, file_url, file_category, created_at')
        .eq('part_id', part.id)
        .order('created_at', { ascending: true }),
      supabase
        .from('part_comments')
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
        .eq('part_id', part.id)
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(10),
      user
        ? supabase
            .from('part_likes')
            .select('id')
            .eq('part_id', part.id)
            .eq('user_id', user.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase
        .from('part_products')
        .select(`
          products(
            id,
            name,
            slug,
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
          )
        `)
        .eq('part_id', part.id),
      part.source_platform
        ? getSourcePlatformBySlug(part.source_platform)
        : Promise.resolve(null),
    ])

    if (filesError) console.error('Error fetching model files:', filesError)
    if (commentsError) console.error('Error fetching comments:', commentsError)
    if (likeError) console.error('Error checking like status:', likeError)
    if (partProductsError) console.error('Error fetching part products:', partProductsError)

    const author = first(part.user_profiles)
    const category = first(part.categories)
    const brand = first(part.brands)
    const license = first(part.licenses)
    const sourceLicense = first(part.source_licenses)

    /** All products linked via the part_products junction table. */
    const compatibleProducts = (partProducts ?? [])
      .map((row) => first(row.products))
      .filter((p): p is NonNullable<typeof p> => p !== null)

    return NextResponse.json({
      part: {
        id: part.id,
        slug: part.slug,
        name: part.name,
        description: part.description,
        partDetails: {
          partName: part.part_name,
          partNumber: part.part_number,
          material: part.material,
          color: part.color,
          dimensions: part.dimensions,
        },
        printSettings: part.print_settings,
        estimatedPrintTime: part.estimated_print_time,
        estimatedMaterialUsage: part.estimated_material_usage,
        thumbnailUrl: part.thumbnail_url,
        images: part.images || [],
        stats: {
          downloads: part.download_count || 0,
          likes: part.like_count || 0,
          views: part.view_count || 0,
        },
        viewerHasLiked: Boolean(likeRow),
        tags: part.tags || [],
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
        originType: part.origin_type,
        verificationStatus: part.verification_status,
        fileHostingType: part.file_hosting_type ?? 'hosted',
        sourcePlatform: part.source_platform,
        sourcePlatformName: platformData?.name ?? null,
        sourcePlatformBaseUrl: platformData?.base_url ?? null,
        sourceUrl: part.source_url,
        originalAuthor: part.original_author,
        originalAuthorUrl: part.original_author_url,
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
        instructions: part.instructions,
        notes: part.notes,
        createdAt: part.created_at,
        updatedAt: part.updated_at,
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
        products: compatibleProducts.map((p) => {
          const pBrand = first(p.brands)
          return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description,
            releaseYear: p.release_year,
            discontinued: p.discontinued,
            image: resolveStorageUrl(p.image_url),
            brand: pBrand ? {
              id: pBrand.id,
              name: pBrand.name,
              slug: pBrand.slug,
              description: pBrand.description,
              logo: pBrand.logo_url,
              website: pBrand.website_url,
              verified: pBrand.verified,
            } : null,
          }
        }),
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
    console.error('Unexpected error fetching part details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}