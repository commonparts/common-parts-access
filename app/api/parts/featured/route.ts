import { NextResponse } from 'next/server'
import { fetchFeaturedPartCards } from '@/lib/supabase/queries/part'
import { getApiTranslations } from '@/lib/api/translations'

// GET /api/parts/featured - Get the most recently added parts
export async function GET(request: Request) {
  const t = await getApiTranslations(request)
  try {
    const parts = await fetchFeaturedPartCards(8)

    // Payload key stays `parts` — see the note in ../route.ts.
    return NextResponse.json({
      parts: parts,
      total: parts.length,
    })
  } catch (error) {
    console.error('Unexpected error fetching featured parts:', error)
    return NextResponse.json(
      { error: t('serverError') },
      { status: 500 }
    )
  }
}