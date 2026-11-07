import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchUserParts } from '@/lib/supabase/queries/part'
import { parseSearchParams } from '@/lib/api/parse'
import { myPartsQuerySchema } from '@/lib/schemas/parts'
import { getApiTranslations } from '@/lib/api/translations'

// GET /api/parts/mine - List the authenticated user's own parts
export async function GET(request: NextRequest) {
  const t = await getApiTranslations(request)
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: t('signInRequired') }, { status: 401 })
    }

    const query = await parseSearchParams(request, myPartsQuerySchema)
    if (!query.ok) return query.response

    const result = await fetchUserParts(user.id, query.data)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch user parts:', error)
    return NextResponse.json({ error: t('serverError') }, { status: 500 })
  }
}
