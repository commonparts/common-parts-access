import type { Locale } from 'next-intl'
import { createClient } from '@/lib/supabase/server'
import { localizeCategory } from '@/lib/utils/locale'
import type { Category } from '@/types/database'

/** The category columns listed by fetchCategoriesTree. */
export type CategoryTreeNode = Pick<Category, 'id' | 'name' | 'slug' | 'parent_id' | 'level' | 'path'>

/** Every category, named in `locale` (#502). */
export async function fetchCategoriesTree(locale: Locale): Promise<CategoryTreeNode[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, name_fr, slug, parent_id, level, path')
    .order('path', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []).map((category) => localizeCategory(category, locale))
}
