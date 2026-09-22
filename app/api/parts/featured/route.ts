import { NextResponse } from 'next/server'
import { fetchFeaturedPartCards } from '@/lib/supabase/queries/part'

// GET /api/parts/featured - Get the most downloaded parts
export async function GET() {
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
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}