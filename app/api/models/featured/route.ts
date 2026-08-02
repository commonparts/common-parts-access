import { NextResponse } from 'next/server'
import { fetchFeaturedPartCards } from '@/lib/supabase/queries/model'

// GET /api/models/featured - Get the most downloaded parts
export async function GET() {
  try {
    const parts = await fetchFeaturedPartCards(8)

    // Payload key stays `models` — see the note in ../route.ts.
    return NextResponse.json({
      models: parts,
      total: parts.length,
    })
  } catch (error) {
    console.error('Unexpected error fetching featured models:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}