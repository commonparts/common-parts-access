import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { resolveStorageUrl } from '@/lib/storage/url'
import { getSourcePlatformBySlug } from '@/lib/supabase/queries/platforms'
import { distinctBrands } from '@/lib/utils/catalog'
import { toPrintReportStats } from '@/lib/utils/print-reports'
import type { Brand } from '@/types/database'
import { firstEmbedded } from '@/lib/utils/supabase-embed'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'
import { PART_UPLOAD_LIMITS } from '@/lib/storage/file-validation'

/**
 * Compatible products listed on a part page, each rendering print report
 * controls (issue #318). Equal to the link limit, so the page lists every
 * linked product (issue #222).
 */
const MAX_COMPATIBLE_PRODUCTS = VALIDATION_LIMITS.PART.PRODUCTS_MAX_COUNT

/**
 * Files listed on a part page. A part holds at most this many: model files and
 * images are the only categories, each capped at upload.
 */
const MAX_PART_FILES = PART_UPLOAD_LIMITS.maxModelFiles + PART_UPLOAD_LIMITS.maxThumbnailFiles

/** References offered per compatible product when adding details to a print report (issue #318). */
const MAX_REPORT_REFERENCES_PER_PRODUCT = 20

/** A brand in the part's derived brand list (issue #315): the links above the title. */
interface BrandLinkPayload {
  id: string
  name: string
  slug: string
}

/** The brand of a compatible product, with the verified mark shown beside it. */
interface ProductBrandPayload {
  name: string
  slug: string
  verified: boolean
}

type BrandRow = Pick<Brand, 'id' | 'name' | 'slug' | 'verified'>

/** Maps a brands row to an entry of the part's derived brand list. */
function toBrandLinkPayload(brand: BrandRow): BrandLinkPayload {
  return { id: brand.id, name: brand.name, slug: brand.slug }
}

/** Maps a brands row to the brand carried on a compatible product. */
function toProductBrandPayload(brand: BrandRow): ProductBrandPayload {
  return { name: brand.name, slug: brand.slug, verified: brand.verified ?? false }
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
          like_count,
          tags,
          instructions,
          notes,
          created_at,
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
            name,
            short_name,
            url,
            requires_attribution,
            is_copyleft
          ),
          source_licenses:licenses!parts_source_license_id_fkey(
            name,
            short_name,
            url,
            requires_attribution,
            is_copyleft
          ),
          user_profiles!inner(
            username,
            display_name,
            avatar_url,
            location,
            verified_maker
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
      { data: likeRow, error: likeError },
      { data: partProducts, error: partProductsError },
      platformData,
    ] = await Promise.all([
      supabase
        .from('part_files')
        .select('id, original_filename, file_type, file_size, file_url, file_category')
        .eq('part_id', part.id)
        .order('created_at', { ascending: true })
        .limit(MAX_PART_FILES),
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
          evidence_level,
          works_count,
          works_with_adjustments_count,
          does_not_work_count,
          products(
            id,
            name,
            slug,
            image_url,
            brands(
              id,
              name,
              slug,
              verified
            ),
            categories(name, slug),
            product_references(id, value, type)
          )
        `)
        .eq('part_id', part.id)
        // `type` is selected only to order the references; it is not returned.
        .order('type', { referencedTable: 'products.product_references' })
        .order('value', { referencedTable: 'products.product_references' })
        .limit(MAX_REPORT_REFERENCES_PER_PRODUCT, { referencedTable: 'products.product_references' })
        .limit(MAX_COMPATIBLE_PRODUCTS),
      part.source_platform
        ? getSourcePlatformBySlug(part.source_platform)
        : Promise.resolve(null),
    ])

    if (filesError) console.error('Error fetching model files:', filesError)
    if (likeError) console.error('Error checking like status:', likeError)
    if (partProductsError) console.error('Error fetching part products:', partProductsError)

    // A curated part is someone else's design: the page credits its original
    // author, not the account that added it, so that profile is not returned (#372).
    const author = part.origin_type === 'curated' ? null : firstEmbedded(part.user_profiles)
    const license = firstEmbedded(part.licenses)
    const sourceLicense = firstEmbedded(part.source_licenses)

    /** All products linked via the part_products junction table. */
    const compatibleProducts = (partProducts ?? [])
      .map((row) => {
        const product = firstEmbedded(row.products)
        return product ? { ...product, reportStats: toPrintReportStats(row) } : null
      })
      .filter((p): p is NonNullable<typeof p> => p !== null)

    // The part's brands, derived from those products (issue #315). Same rule as
    // the part card, so a part never shows one set of brands on /browse and
    // another on its own page.
    const derivedBrands = distinctBrands(
      compatibleProducts.map((product) => {
        const brand = firstEmbedded(product.brands)
        return brand ? toBrandLinkPayload(brand) : null
      }),
    )

    return NextResponse.json({
      part: {
        id: part.id,
        slug: part.slug,
        name: part.name,
        description: part.description,
        // Print reports only land on published parts; an owner previewing a
        // draft gets no report controls (issue #318).
        isPublished: part.status === 'published',
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
          likes: part.like_count || 0,
        },
        viewerHasLiked: Boolean(likeRow),
        tags: part.tags || [],
        license: license ? {
          name: license.name,
          shortName: license.short_name,
          url: license.url,
          requiresAttribution: license.requires_attribution,
          isCopyleft: license.is_copyleft,
        } : null,
        originType: part.origin_type,
        verificationStatus: part.verification_status,
        fileHostingType: part.file_hosting_type ?? 'hosted',
        sourcePlatform: part.source_platform,
        sourcePlatformName: platformData?.name ?? null,
        sourceUrl: part.source_url,
        originalAuthor: part.original_author,
        originalAuthorUrl: part.original_author_url,
        sourceLicense: sourceLicense ? {
          name: sourceLicense.name,
          shortName: sourceLicense.short_name,
          url: sourceLicense.url,
          requiresAttribution: sourceLicense.requires_attribution,
          isCopyleft: sourceLicense.is_copyleft,
        } : null,
        instructions: part.instructions,
        notes: part.notes,
        createdAt: part.created_at,
        author: author ? {
          username: author.username,
          displayName: author.display_name,
          avatar: author.avatar_url,
          location: author.location,
          verifiedMaker: author.verified_maker,
        } : null,
        products: compatibleProducts.map((p) => {
          const pBrand = firstEmbedded(p.brands)
          const pCategory = firstEmbedded(p.categories)
          return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            image: resolveStorageUrl(p.image_url),
            brand: pBrand ? toProductBrandPayload(pBrand) : null,
            // The category belongs to the product, not to the part (#372).
            category: pCategory ? { name: pCategory.name, slug: pCategory.slug } : null,
            reportStats: p.reportStats,
            references: (p.product_references ?? []).map((r) => ({ id: r.id, value: r.value })),
          }
        }),
        brands: derivedBrands,
        files: files || [],
      },
    })
  } catch (error) {
    console.error('Unexpected error fetching part details:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}