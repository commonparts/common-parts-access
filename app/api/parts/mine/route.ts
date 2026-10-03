import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchUserParts } from '@/lib/supabase/queries/part'
import type { PartStatus } from '@/types/database'

const VALID_STATUSES: PartStatus[] = ['draft', 'published', 'archived']

// GET /api/parts/mine - List the authenticated user's own parts
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    const rawPage = parseInt(searchParams.get('page') ?? '1', 10)
    const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1

    const rawStatus = searchParams.get('status') ?? 'published'
    const status: PartStatus = (VALID_STATUSES as string[]).includes(rawStatus)
      ? (rawStatus as PartStatus)
      : 'published'

    const result = await fetchUserParts(user.id, { page, status })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch user parts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
