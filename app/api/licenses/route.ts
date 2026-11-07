import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getApiTranslations } from '@/lib/api/translations'

// GET /api/licenses - List all licenses ordered by short_name
export async function GET(request: Request) {
  const t = await getApiTranslations(request)
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('licenses')
      .select('id, spdx_id, short_name, name, url, requires_attribution, allows_commercial, allows_redistribution, is_copyleft')
      .order('short_name', { ascending: true })

    if (error) {
      console.error('Failed to fetch licenses', error)
      return NextResponse.json({ error: t('loadFailed') }, { status: 500 })
    }

    return NextResponse.json({ licenses: data })
  } catch (error) {
    console.error('Failed to fetch licenses', error)
    return NextResponse.json({ error: t('loadFailed') }, { status: 500 })
  }
}
