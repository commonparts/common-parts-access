import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchUserModels } from '@/lib/supabase/queries/model'
import type { ModelStatus } from '@/types/database'

const VALID_STATUSES: ModelStatus[] = ['draft', 'published', 'archived']

// GET /api/models/mine - List the authenticated user's own models
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
    const status: ModelStatus = (VALID_STATUSES as string[]).includes(rawStatus)
      ? (rawStatus as ModelStatus)
      : 'published'

    const result = await fetchUserModels(user.id, { page, status })
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch user models:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
