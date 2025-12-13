import { createClient } from '@/lib/supabase/server';
import type {
  ModelCardData,
  ModelCardRow,
  ModelListOptions,
  ModelListResult,
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
  products(
    name
  ),
  categories(
    name,
    slug
  )
`;

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

  let query = supabase
    .from('models')
    .select<ModelCardRow>(MODEL_SELECT, { count: 'exact' });

  if (options.status) query = query.eq('status', options.status);
  if (options.category) query = query.eq('category_id', options.category);
  if (options.brand) query = query.eq('brand_id', options.brand);
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

  const models = (data ?? []).map(mapModelRowToCard);
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
    .select<ModelCardRow>(MODEL_SELECT)
    .eq('status', 'published')
    .order('download_count', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapModelRowToCard);
}