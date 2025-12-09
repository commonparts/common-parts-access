import { NextResponse } from 'next/server'
import { fetchFeaturedModelCards } from '@/lib/supabase/queries/model'

// GET /api/models/featured - Get the most downloaded models
export async function GET() {
  try {
    const models = await fetchFeaturedModelCards(8)

    return NextResponse.json({ 
      models,
      total: models.length
    })
  } catch (error) {
    console.error('Unexpected error fetching featured models:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}