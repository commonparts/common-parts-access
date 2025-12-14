import { createClient } from '@/lib/supabase/server'
import type { Product } from '@/types/database'

export interface FetchProductsParams {
  brandId?: string
  categoryId?: string
  search?: string
  limit?: number
}

export async function fetchProducts(params: FetchProductsParams = {}): Promise<Product[]> {
  const supabase = await createClient()
  const limit = params.limit && params.limit > 0 ? params.limit : 100

  let query = supabase
    .from('products')
    .select('id, name, slug, brand_id, category_id, model_number')
    .order('name', { ascending: true })
    .limit(limit)

  if (params.brandId) {
    query = query.eq('brand_id', params.brandId)
  }

  if (params.categoryId) {
    query = query.eq('category_id', params.categoryId)
  }

  if (params.search && params.search.trim()) {
    query = query.ilike('name', `%${params.search.trim()}%`)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return (data ?? []) as Product[]
}
