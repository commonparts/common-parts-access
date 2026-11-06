import { createClient } from '@/lib/supabase/server'
import type { Brand } from '@/types/database'

/** The brand columns listed by fetchBrands. */
export type BrandSummary = Pick<Brand, 'id' | 'name' | 'slug' | 'verified'>

export async function fetchBrands(): Promise<BrandSummary[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('brands')
    .select('id, name, slug, verified')
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  return data ?? []
}
