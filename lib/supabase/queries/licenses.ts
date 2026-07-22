import { createClient } from '@/lib/supabase/server'

/**
 * Returns the license matching an SPDX identifier, or null if the registry
 * does not carry it. Case-insensitive: sources report ids in varying casings.
 * RLS: licenses are public-read reference data.
 */
export async function getLicenseBySpdxId(spdxId: string): Promise<{ id: string; spdx_id: string } | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('licenses')
    .select('id, spdx_id')
    .ilike('spdx_id', spdxId)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}
