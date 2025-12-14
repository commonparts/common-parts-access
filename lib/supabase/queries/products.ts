import { createClient } from '@/lib/supabase/server'
import type { Product } from '@/types/database'

export interface FetchProductsParams {
  brandId?: string
  categoryId?: string
  includeDescendants?: boolean
  search?: string
  limit?: number
}

export async function fetchProducts(params: FetchProductsParams = {}): Promise<Product[]> {
  const supabase = await createClient()
  const limit = params.limit && params.limit > 0 ? params.limit : 100

  const resolveCategoryIds = async (): Promise<string[] | undefined> => {
    if (!params.categoryId) return undefined
    if (!params.includeDescendants) return [params.categoryId]

    const { data: targetCategory, error: targetError } = await supabase
      .from('categories')
      .select('id, path')
      .eq('id', params.categoryId)
      .single()

    if (targetError) {
      console.error('fetchProducts: failed to resolve category path', targetError)
      return [params.categoryId]
    }

    if (targetCategory?.path) {
      const { data: descendants, error: descError } = await supabase
        .from('categories')
        .select('id')
        .ilike('path', `${targetCategory.path}%`)

      if (descError) {
        console.error('fetchProducts: failed to fetch descendant categories', descError)
        return [params.categoryId]
      }

      const ids = (descendants ?? []).map((c) => c.id)
      return ids.length ? ids : [params.categoryId]
    }

    return [params.categoryId]
  }

  const categoryIds = await resolveCategoryIds()

  let query = supabase
    .from('products')
    .select('id, name, slug, brand_id, category_id, model_number')
    .order('name', { ascending: true })
    .limit(limit)

  if (params.brandId) {
    query = query.eq('brand_id', params.brandId)
  }

  if (categoryIds && categoryIds.length > 0) {
    query = query.in('category_id', categoryIds)
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
