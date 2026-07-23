import { createClient } from '@/lib/supabase/server'

export interface LicenseRow {
  id: string
  spdx_id: string
  allows_commercial: boolean
  allows_redistribution: boolean
}

const LICENSE_COLUMNS = 'id, spdx_id, allows_commercial, allows_redistribution'

/**
 * Returns the license matching an SPDX identifier, or null if the registry
 * does not carry it. Case-insensitive: sources report ids in varying casings.
 * RLS: licenses are public-read reference data.
 */
export async function getLicenseBySpdxId(spdxId: string): Promise<LicenseRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('licenses')
    .select(LICENSE_COLUMNS)
    .ilike('spdx_id', spdxId)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}

/**
 * Returns a license with the columns needed for hosting-policy checks,
 * or null if the id is unknown. RLS: licenses are public-read reference data.
 */
export async function getLicenseById(id: string): Promise<LicenseRow | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('licenses')
    .select(LICENSE_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ?? null
}
