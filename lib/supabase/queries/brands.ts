import { createClient } from '@/lib/supabase/server'
import type { Brand } from '@/types/database'

export async function fetchBrands(): Promise<Brand[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('brands')
    .select('id, name, slug, verified')
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? []) as Brand[]
}
