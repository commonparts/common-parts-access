import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody } from '@/lib/api/parse'
import { partRequestSchema } from '@/lib/schemas/part-requests'
import { createPartRequest } from '@/lib/supabase/queries/part-requests'

// POST /api/part-requests — captures part demand ("Request this part").
// Open to anonymous and authenticated users; payload is validated server-side.
// Deliberately does NOT touch the feedback table or the triage pipeline, so no
// GitHub issue is created.
export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request, partRequestSchema, 'Invalid JSON body')
    if (!body.ok) return body.response

    await createPartRequest(body.data)
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Failed to create part request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
