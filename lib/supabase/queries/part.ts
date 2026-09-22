import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { STORAGE_BUCKETS } from '@/constants/app';
import { extractBucketStoragePath } from '@/lib/storage/path-utils';
import { slugify } from '@/lib/utils/slug';
import { VALIDATION_LIMITS } from '@/lib/utils/constants';
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

// Every embed of part_products is aliased (`fits`, `fits_count`, and
// `fit_filter` below). PostgREST resolves an unaliased filter or limit against
// the first embed of that table, so without the aliases the product filter
// would land on the preview list instead of the join it belongs to.
const PART_CARD_SELECT = `
  id,
  name,
  slug,
  description,
  thumbnail_url,
  brands(
    name,
    slug
  ),
  fits:part_products(
    products(
      name,
      slug
    )
  ),
  fits_count:part_products(count)
`;

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

function mapPartRowToCard(row: PartCardRow): PartCardData {
  const brand = firstJoined(row.brands);

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
    brand: brand ? { name: brand.name, slug: brand.slug } : null,
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
  // longer carry a direct product_id). An inner join keeps pagination and the
  // exact count correct regardless of how many parts a product links to. It is
  // aliased so it never collides with the `fits` preview embed of the same table.
  let query = options.product
    ? supabase
        .from('parts')
        .select(`${PART_CARD_SELECT}, fit_filter:part_products!inner(product_id)`, { count: 'exact' })
    : supabase
        .from('parts')
        .select(PART_CARD_SELECT, { count: 'exact' });

  if (options.status) query = query.eq('status', options.status);
  if (options.category) query = query.eq('category_id', options.category);
  if (options.brand) query = query.eq('brand_id', options.brand);
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

  const parts = ((data ?? []) as PartCardRow[]).map(mapPartRowToCard);
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
  brands(name),
  licenses!parts_license_id_fkey(name, url),
  source_licenses:licenses!parts_source_license_id_fkey(name, url),
  part_products(products(name, brands(name)))
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
    .limit(VALIDATION_LIMITS.PART.PRODUCTS_MAX_COUNT, { referencedTable: 'part_products' })
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const part = data as unknown as PartSeoRow;
  const author = firstJoined(part.user_profiles);
  const brand = firstJoined(part.brands);
  // Curated parts are governed by the source license — same precedence as the
  // details route and the download license notice.
  const license = firstJoined(part.source_licenses) ?? firstJoined(part.licenses);

  const products = (part.part_products ?? [])
    .map((row) => firstJoined(row.products))
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => ({
      name: p.name,
      brandName: firstJoined(p.brands)?.name ?? null,
    }));

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
    brandName: brand?.name ?? null,
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