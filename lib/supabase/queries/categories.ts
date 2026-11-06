import { createClient } from '@/lib/supabase/server'
import type { Category } from '@/types/database'

/** The category columns listed by fetchCategoriesTree. */
export type CategoryTreeNode = Pick<Category, 'id' | 'name' | 'slug' | 'parent_id' | 'level' | 'path'>

export async function fetchCategoriesTree(): Promise<CategoryTreeNode[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id, level, path')
    .order('path', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}
