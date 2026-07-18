import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { STORAGE_BUCKETS } from '@/constants/app';
import { extractBucketStoragePath } from '@/lib/storage/path-utils';
import { slugify } from '@/lib/utils/slug';
import { VALIDATION_LIMITS } from '@/lib/utils/constants';
import type { ModelStatus } from '@/types/database';
import type {
  ModelCardData,
  ModelCardRow,
  ModelListOptions,
  ModelListResult,
  ModelSeoData,
  ModelSeoRow,
  MyModelListItem,
  MyModelListResult,
} from '@/types/models';

const MODEL_SELECT = `
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
  categories(
    name,
    slug
  )
`;

/**
 * Derives a slug from the model name and suffixes it until it is unique in
 * models.slug. Falls back to a timestamp suffix after 50 collisions so the
 * loop is always bounded.
 */
export async function ensureUniqueModelSlug(
  name: string,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string> {
  const base = slugify(name) || `model-${Date.now().toString(36)}`;
  let candidate = base;
  let counter = 1;

  while (true) {
    const { data, error } = await supabase
      .from('models')
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

function mapModelRowToCard(model: ModelCardRow): ModelCardData {
  const userProfile = Array.isArray(model.user_profiles)
    ? model.user_profiles[0]
    : model.user_profiles;
  const category = Array.isArray(model.categories)
    ? model.categories[0]
    : model.categories;

  return {
    id: model.id,
    slug: model.slug,
    title: model.name,
    description: model.description,
    thumbnailUrl: model.thumbnail_url,
    author: {
      username: userProfile?.username || 'Unknown',
      avatar: userProfile?.avatar_url ?? null,
    },
    stats: {
      downloads: model.download_count || 0,
      likes: model.like_count || 0,
      views: model.view_count || 0,
    },
    tags: Array.isArray(model.tags) ? model.tags : [],
    category: category?.name || 'Uncategorized',
    createdAt: model.created_at ? new Date(model.created_at) : new Date(),
    isPremium: false,
  };
}

function resolveOrderColumn(sortBy?: ModelListOptions['sortBy']) {
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
export async function fetchModelCards(options: ModelListOptions = {}): Promise<ModelListResult> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, options.limit || 20);
  const sortOrder = options.sortOrder === 'asc' ? 'asc' : 'desc';
  const search = options.search?.trim() || '';

  const supabase = await createClient();

  // Filtering by product goes through the model_products junction (models no
  // longer carry a direct product_id). An inner join keeps pagination and the
  // exact count correct regardless of how many models a product links to.
  let query = options.product
    ? supabase
        .from('models')
        .select(`${MODEL_SELECT}, model_products!inner(product_id)`, { count: 'exact' })
    : supabase
        .from('models')
        .select(MODEL_SELECT, { count: 'exact' });

  if (options.status) query = query.eq('status', options.status);
  if (options.category) query = query.eq('category_id', options.category);
  if (options.brand) query = query.eq('brand_id', options.brand);
  if (options.product) query = query.eq('model_products.product_id', options.product);
  if (search) query = query.ilike('name', `%${search}%`);

  query = query.order(resolveOrderColumn(options.sortBy), {
    ascending: sortOrder === 'asc',
  });

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  const models = ((data ?? []) as ModelCardRow[]).map(mapModelRowToCard);
  const total = count || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    models,
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

// Top models by downloads for the featured section.
export async function fetchFeaturedModelCards(limit = 8) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('models')
    .select(MODEL_SELECT)
    .eq('status', 'published')
    .order('download_count', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return ((data ?? []) as ModelCardRow[]).map(mapModelRowToCard);
}

const MODEL_SEO_SELECT = `
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
  licenses!models_license_id_fkey(name, url),
  source_licenses:licenses!models_source_license_id_fkey(name, url),
  model_products(products(name, brands(name)))
`;

// Supabase returns joined rows as T | T[] depending on cardinality —
// normalize to a single record, matching mapModelRowToCard above.
function firstJoined<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * Fetches the minimal published-model dataset needed for part page SEO:
 * metadata title/description, Open Graph tags, and schema.org structured data.
 * Wrapped in React cache() so generateMetadata and the page component share a
 * single query per request. Returns null when the part is not found or not
 * published; rethrows other database errors.
 * RLS: covered by the public read policy on published models.
 */
export const fetchModelSeoBySlug = cache(async (slug: string): Promise<ModelSeoData | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('models')
    .select(MODEL_SEO_SELECT)
    .eq('slug', slug)
    .eq('status', 'published')
    .limit(VALIDATION_LIMITS.MODEL.PRODUCTS_MAX_COUNT, { referencedTable: 'model_products' })
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const model = data as unknown as ModelSeoRow;
  const author = firstJoined(model.user_profiles);
  const brand = firstJoined(model.brands);
  // Curated parts are governed by the source license — same precedence as the
  // details route and the download license notice.
  const license = firstJoined(model.source_licenses) ?? firstJoined(model.licenses);

  const products = (model.model_products ?? [])
    .map((row) => firstJoined(row.products))
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .map((p) => ({
      name: p.name,
      brandName: firstJoined(p.brands)?.name ?? null,
    }));

  return {
    id: model.id,
    name: model.name,
    slug: model.slug,
    description: model.description ?? null,
    thumbnailUrl: model.thumbnail_url ?? null,
    createdAt: model.created_at ?? null,
    updatedAt: model.updated_at ?? null,
    tags: Array.isArray(model.tags) ? model.tags : [],
    authorName: author?.display_name || author?.username || null,
    originalAuthor: model.original_author ?? null,
    originalAuthorUrl: model.original_author_url ?? null,
    brandName: brand?.name ?? null,
    licenseName: license?.name ?? null,
    licenseUrl: license?.url ?? null,
    products,
  };
});

const MY_MODEL_SELECT = 'id, name, slug, created_at, thumbnail_url, status' as const;

/**
 * Fetches models owned by a specific user, ordered by creation date descending.
 * Returns a paginated list suitable for the "My Models" dashboard.
 */
export async function fetchUserModels(
  userId: string,
  options: { page?: number; limit?: number; status?: ModelStatus } = {}
): Promise<MyModelListResult> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 20));
  const supabase = await createClient();

  let query = supabase
    .from('models')
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
    models: (data ?? []).map(
      (row: { id: string; name: string; slug: string; created_at: string | null; thumbnail_url: string | null; status: string | null }): MyModelListItem => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        createdAt: row.created_at ?? null,
        thumbnailUrl: row.thumbnail_url ?? null,
        status: (row.status ?? 'draft') as MyModelListItem['status'],
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
 * Deletes a model by slug after verifying the caller is the owner.
 * Deletes the database row first, then removes associated storage objects
 * (model files + thumbnail) as a best-effort cleanup step.
 * Throws 'MODEL_NOT_FOUND' if not found, 'FORBIDDEN' if not owner.
 */
export async function deleteModel(slug: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { data: model, error: fetchError } = await supabase
    .from('models')
    .select('id, user_id, thumbnail_url, model_files(upload_path)')
    .eq('slug', slug)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') throw new Error('MODEL_NOT_FOUND');
    throw fetchError;
  }
  if (!model) throw new Error('MODEL_NOT_FOUND');
  if (model.user_id !== userId) throw new Error('FORBIDDEN');

  const filePaths = (model.model_files as { upload_path: string }[])
    .map((f) => f.upload_path)
    .filter(Boolean);

  const thumbnailPath = extractBucketStoragePath(
    model.thumbnail_url,
    STORAGE_BUCKETS.MODEL_THUMBNAILS
  );

  const { error } = await supabase
    .from('models')
    .delete()
    .eq('id', model.id)
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