import { NextRequest, NextResponse } from 'next/server'
import { createPartRequest, validatePartRequestInput } from '@/lib/supabase/queries/part-requests'

// POST /api/part-requests — captures part demand ("Request this part").
// Open to anonymous and authenticated users; payload is validated server-side.
// Deliberately does NOT touch the feedback table or the triage pipeline, so no
// GitHub issue is created.
export async function POST(request: NextRequest) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validation = validatePartRequestInput(body)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    await createPartRequest(validation.value)
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Failed to create part request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
