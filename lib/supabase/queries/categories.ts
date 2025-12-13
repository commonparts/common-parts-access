import { createClient } from '@/lib/supabase/server'
import type { Category } from '@/types/database'

export async function fetchCategoriesTree(): Promise<Category[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id, level, path')
    .order('path', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as Category[]
}
