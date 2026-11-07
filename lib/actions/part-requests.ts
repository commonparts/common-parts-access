'use server'

import type { z } from 'zod'
import { validate, type Result } from '@/lib/api/parse'
import { partRequestSchema } from '@/lib/schemas/part-requests'
import { createPartRequest } from '@/lib/supabase/queries/part-requests'

/**
 * Captures part demand ("Request this part"). Open to anonymous visitors;
 * `createPartRequest` attributes the request to the signed-in user, if any.
 * Deliberately does not touch the feedback table or the triage pipeline, so
 * no GitHub issue is created.
 */
export async function requestPart(input: z.input<typeof partRequestSchema>): Promise<Result<null>> {
  const parsed = await validate(partRequestSchema, input)
  if (!parsed.ok) return parsed

  await createPartRequest(parsed.data)
  return { ok: true, data: null }
}
