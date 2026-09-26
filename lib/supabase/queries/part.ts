import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { STORAGE_BUCKETS } from '@/constants/app';
import { extractBucketStoragePath } from '@/lib/storage/path-utils';
import { slugify } from '@/lib/utils/slug';
import { VALIDATION_LIMITS } from '@/lib/utils/constants';
import { distinctBrands } from '@/lib/utils/catalog';
import type { PartStatus } from '@/types/database';
import type {
  PartCardData,
  PartCardRow,
  PartListOptions,
  PartListResult,
  PartSeoData,
  PartSeoRow,
  MyPartListItem,
  MyPartListResult,
} from '@/types/parts';

/**
 * How many compatible products a card lists by name before collapsing the rest
 * into "+N more". The untruncated total comes from the `fits_count` aggregate,
 * so the preview stays bounded no matter how many products a part fits.
 */
const CARD_PRODUCT_PREVIEW_COUNT = 2;

/** Sort key of the `fits` embed — the linked product's name, matching search_all. */
const CARD_PRODUCT_ORDER = 'products(name)';

// Every embed of part_products is aliased (`fits`, `brand_fits`, `fits_count`,
// and `fit_filter` / `brand_filter` below). PostgREST resolves an unaliased
// filter or limit against the first embed of that table, so without the
// aliases the product filter would land on the preview list instead of the
// join it belongs to.
//
// `brand_fits` repeats the junction for the brands alone (issue #315): the
// part has no brand of its own any more, and reusing `fits` would derive the
// brand set from a list truncated to CARD_PRODUCT_PREVIEW_COUNT products.
//
// It carries no limit of its own, deliberately. The brand set is what files a
// part in the navigation, so a partial one misattributes it — and the publish
// gate's cap on links is not a database constraint (production already holds
// a part with 17, above it), so any cap here would silently drop brands from
// exactly the parts that have the most, and nondeterministically: PostgREST
// returns no guaranteed order. The fan-out is one small row per link, under a
// top-level page of 20, and `fits_count` reports the true total.
const PART_CARD_SELECT = `
  id,
  name,
  slug,
  description,
  thumbnail_url,
  fits:part_products(
    products(
      name,
      slug
    )
  ),
  brand_fits:part_products(
    products(
      brands(
        name,
        slug
      )
    )
  ),
  fits_count:part_products(count)
`;

/** Inner join restricting the page to parts linked to one product. */
const FIT_FILTER_JOIN = 'fit_filter:part_products!inner(product_id)';

/**
 * Inner join restricting the page to parts linked to any product of one brand
 * — how a part is filed under a brand since #315, the part itself no longer
 * carrying one.
 */
const BRAND_FILTER_JOIN = 'brand_filter:part_products!inner(products!inner(brand_id))';

/**
 * Derives a slug from the part name and suffixes it until it is unique in
 * parts.slug. Falls back to a timestamp suffix after 50 collisions so the
 * loop is always bounded.
 */
export async function ensureUniquePartSlug(
  name: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  const base = slugify(name) || `part-${Date.now().toString(36)}`;
  let candidate = base;
  let counter = 1;

  while (true) {
    const { data, error } = await supabase
      .from('parts')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    // A failed read must not pass for "slug free" — that would hand out
    // colliding slugs and surface as a confusing unique-violation later.
    if (error) throw error;

    if (!data) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
    if (counter > 50) {
      return `${base}-${Date.now().toString(36)}`;
    }
  }
}

// Supabase returns joined rows as T | T[] depending on cardinality —
// normalize to a single record.
function firstJoined<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * The brands of a card's part, read off the untruncated `brand_fits` embed.
 * The ordering and deduplication rule is shared with the part detail payload
 * — see distinctBrands.
 */
function deriveCardBrands(row: PartCardRow): PartCardData['brands'] {
  return distinctBrands(
    (row.brand_fits ?? []).map((link) => {
      const brand = firstJoined(firstJoined(link.products)?.brands);
      return brand ? { name: brand.name, slug: brand.slug } : null;
    }),
  );
}

function mapPartRowToCard(row: PartCardRow): PartCardData {
  const products = (row.fits ?? [])
    .map((link) => firstJoined(link.products))
    .filter((product): product is NonNullable<typeof product> => product !== null)
    .map((product) => ({ name: product.name, slug: product.slug }));

  return {
    id: row.id,
    slug: row.slug,
    title: row.name,
    description: row.description,
    thumbnailUrl: row.thumbnail_url,
    brands: deriveCardBrands(row),
    products,
    // The aggregate covers every link; the preview list is capped, so falling
    // back to its length would under-report the "+N more" overflow.
    productCount: row.fits_count?.[0]?.count ?? products.length,
    isPremium: false,
  };
}

function resolveOrderColumn(sortBy?: PartListOptions['sortBy']) {
  switch (sortBy) {
    case 'popularity':
      return 'download_count';
    case 'likes':
      return 'like_count';
    case 'views':
      return 'view_count';
    case 'newest':
    case 'created_at':
    default:
      return 'created_at';
  }
}

// Paged list with optional filters/search/sorting for browse screens.
export async function fetchPartCards(options: PartListOptions = {}): Promise<PartListResult> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, options.limit || 20);
  const sortOrder = options.sortOrder === 'asc' ? 'asc' : 'desc';
  const search = options.search?.trim() || '';

  const supabase = await createClient();

  // Filtering by product goes through the part_products junction (parts no
  // longer carry a direct product_id), and so does filtering by brand since
  // the part's own brand column was dropped (issue #315) — a brand matches a
  // part when any product it fits belongs to that brand. Both are inner joins,
  // which keep pagination and the exact count correct however many products a
  // part links to, and both are aliased so they never collide with the `fits`
  // and `brand_fits` display embeds of the same table.
  // Spelled out per combination rather than assembled from an array: the
  // Supabase client infers the row type from the select string, and only a
  // literal one carries that type through.
  const select = options.product
    ? options.brand
      ? `${PART_CARD_SELECT}, ${FIT_FILTER_JOIN}, ${BRAND_FILTER_JOIN}`
      : `${PART_CARD_SELECT}, ${FIT_FILTER_JOIN}`
    : options.brand
      ? `${PART_CARD_SELECT}, ${BRAND_FILTER_JOIN}`
      : PART_CARD_SELECT;

  let query = supabase.from('parts').select(select, { count: 'exact' });

  if (options.status) query = query.eq('status', options.status);
  if (options.category) query = query.eq('category_id', options.category);
  if (options.brand) query = query.eq('brand_filter.products.brand_id', options.brand);
  if (options.product) query = query.eq('fit_filter.product_id', options.product);
  if (search) query = query.ilike('name', `%${search}%`);

  query = query.order(resolveOrderColumn(options.sortBy), {
    ascending: sortOrder === 'asc',
  });

  // Order before truncating, by the linked product's name: without an order the
  // embed returns a different subset per request, and ordering by anything else
  // would surface different products here than search_all does for the same
  // part (it orders by name too), so the card would change between /browse and
  // /search. PostgREST resolves `products(name)` against the embed's own join.
  query = query
    .order(CARD_PRODUCT_ORDER, { referencedTable: 'fits' })
    .limit(CARD_PRODUCT_PREVIEW_COUNT, { referencedTable: 'fits' });

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  // Cast through unknown: the client's type-level select parser gives up on
  // the card select once a filter join is appended to it (the string is valid
  // PostgREST — the plain select parses, and the same joins are exercised at
  // runtime). PartCardRow is the contract either way, as for PART_SEO_SELECT.
  const parts = ((data ?? []) as unknown as PartCardRow[]).map(mapPartRowToCard);
  const total = count || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    parts,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

// Top parts by downloads for the featured section.
export async function fetchFeaturedPartCards(limit = 8) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('parts')
    .select(PART_CARD_SELECT)
    .eq('status', 'published')
    .order('download_count', { ascending: false })
    .order(CARD_PRODUCT_ORDER, { referencedTable: 'fits' })
    .limit(CARD_PRODUCT_PREVIEW_COUNT, { referencedTable: 'fits' })
    .limit(limit);

  if (error) {
    throw error;
  }

  return ((data ?? []) as PartCardRow[]).map(mapPartRowToCard);
}

const PART_SEO_SELECT = `
  id,
  name,
  slug,
  description,
  thumbnail_url,
  created_at,
  updated_at,
  tags,
  original_author,
  original_author_url,
  user_profiles!inner(username, display_name),
  licenses!parts_license_id_fkey(name, url),
  source_licenses:licenses!parts_source_license_id_fkey(name, url),
  part_products(products(name, slug, brands(name, slug), categories(name, slug)))
`;

/**
 * Fetches the minimal published-part dataset needed for part page SEO:
 * metadata title/description, Open Graph tags, and schema.org structured data.
 * Wrapped in React cache() so generateMetadata and the page component share a
 * single query per request. Returns null when the part is not found or not
 * published; rethrows other database errors.
 * RLS: covered by the public read policy on published parts.
 */
export const fetchPartSeoBySlug = cache(async (slug: string): Promise<PartSeoData | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('parts')
    .select(PART_SEO_SELECT)
    .eq('slug', slug)
    .eq('status', 'published')
    // Deterministic primary fit: the first product by name drives the SEO
    // title and the breadcrumb trail, so both stay stable across requests.
    // Names are unique per brand only, so the (unique) slug breaks ties.
    .order('products(name)', { referencedTable: 'part_products' })
    .order('products(slug)', { referencedTable: 'part_products' })
    .limit(VALIDATION_LIMITS.PART.PRODUCTS_MAX_COUNT, { referencedTable: 'part_products' })
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const part = data as unknown as PartSeoRow;
  const author = firstJoined(part.user_profiles);
  // Curated parts are governed by the source license — same precedence as the
  // details route and the download license notice.
  const license = firstJoined(part.source_licenses) ?? firstJoined(part.licenses);

  const products = (part.part_products ?? [])
    .map((row) => firstJoined(row.products))
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => {
      const brand = firstJoined(p.brands);
      const category = firstJoined(p.categories);
      return {
        name: p.name,
        slug: p.slug,
        brand: brand ? { name: brand.name, slug: brand.slug } : null,
        category: category ? { name: category.name, slug: category.slug } : null,
      };
    });

  return {
    id: part.id,
    name: part.name,
    slug: part.slug,
    description: part.description ?? null,
    thumbnailUrl: part.thumbnail_url ?? null,
    createdAt: part.created_at ?? null,
    updatedAt: part.updated_at ?? null,
    tags: Array.isArray(part.tags) ? part.tags : [],
    authorName: author?.display_name || author?.username || null,
    originalAuthor: part.original_author ?? null,
    originalAuthorUrl: part.original_author_url ?? null,
    licenseName: license?.name ?? null,
    licenseUrl: license?.url ?? null,
    products,
  };
});

const MY_MODEL_SELECT = 'id, name, slug, created_at, thumbnail_url, status' as const;

/**
 * Fetches parts owned by a specific user, ordered by creation date descending.
 * Returns a paginated list suitable for the "My Parts" dashboard.
 */
export async function fetchUserParts(
  userId: string,
  options: { page?: number; limit?: number; status?: PartStatus } = {}
): Promise<MyPartListResult> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 20));
  const supabase = await createClient();

  let query = supabase
    .from('parts')
    .select(MY_MODEL_SELECT, { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const total = count || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    parts: (data ?? []).map(
      (row: { id: string; name: string; slug: string; created_at: string | null; thumbnail_url: string | null; status: string | null }): MyPartListItem => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        createdAt: row.created_at ?? null,
        thumbnailUrl: row.thumbnail_url ?? null,
        status: (row.status ?? 'draft') as MyPartListItem['status'],
      })
    ),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Deletes a part by slug after verifying the caller is the owner.
 * Deletes the database row first, then removes associated storage objects
 * (model files + thumbnail) as a best-effort cleanup step.
 * Throws 'PART_NOT_FOUND' if not found, 'FORBIDDEN' if not owner.
 */
export async function deletePart(slug: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { data: part, error: fetchError } = await supabase
    .from('parts')
    .select('id, user_id, thumbnail_url, part_files(upload_path)')
    .eq('slug', slug)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') throw new Error('PART_NOT_FOUND');
    throw fetchError;
  }
  if (!part) throw new Error('PART_NOT_FOUND');
  if (part.user_id !== userId) throw new Error('FORBIDDEN');

  const filePaths = (part.part_files as { upload_path: string }[])
    .map((f) => f.upload_path)
    .filter(Boolean);

  const thumbnailPath = extractBucketStoragePath(
    part.thumbnail_url,
    STORAGE_BUCKETS.MODEL_THUMBNAILS
  );

  const { error } = await supabase
    .from('parts')
    .delete()
    .eq('id', part.id)
    .eq('user_id', userId);

  if (error) throw error;

  // Best-effort storage cleanup — failures are logged but never block the DB delete.
  if (filePaths.length > 0) {
    const { error: filesError } = await supabase.storage
      .from(STORAGE_BUCKETS.MODEL_FILES)
      .remove(filePaths);
    if (filesError) {
      console.error('Storage cleanup failed for model-files:', filesError);
    }
  }

  if (thumbnailPath) {
    const { error: thumbError } = await supabase.storage
      .from(STORAGE_BUCKETS.MODEL_THUMBNAILS)
      .remove([thumbnailPath]);
    if (thumbError) {
      console.error('Storage cleanup failed for thumbnail:', thumbError);
    }
  }
}