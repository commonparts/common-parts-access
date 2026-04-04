import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/licenses - List all licenses ordered by short_name
export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('licenses')
      .select('id, spdx_id, short_name, name, url, requires_attribution, allows_commercial, is_copyleft')
      .order('short_name', { ascending: true })

    if (error) {
      console.error('Failed to fetch licenses', error)
      return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 })
    }

    return NextResponse.json({ licenses: data })
  } catch (error) {
    console.error('Failed to fetch licenses', error)
    return NextResponse.json({ error: 'Failed to fetch licenses' }, { status: 500 })
  }
}
