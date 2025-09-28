import { createClient } from '@/lib/supabase/client';
import type { EnhancedModel } from '@/types/database';

const supabase = createClient();

// Keep your existing query functions, add enhanced ones
export async function getModelsEnhanced(options?: {
  limit?: number;
  category?: string;
  brand?: string;
  status?: string;
}) {
  let query = supabase
    .from('models')
    .select(`
      *,
      user_profiles(username, display_name),
      brands(name, slug),
      categories(name, slug)
    `);

  if (options?.status) query = query.eq('status', options.status);
  if (options?.category) query = query.eq('category_id', options.category);
  if (options?.brand) query = query.eq('brand_id', options.brand);
  if (options?.limit) query = query.limit(options.limit);

  return query.order('created_at', { ascending: false });
}