import { z } from 'zod'
import { uuid } from '@/lib/schemas/common'
import { MAX_REFERENCE_LENGTH } from '@/lib/utils/product-references'

/** Request schemas of the search endpoints. */

/**
 * GET /api/search — `q` is any text (searchAll() trims and truncates it);
 * `limit` is an integer, clamped by searchAll() to the allowed range.
 */
export const searchQuerySchema = z.object({
  q: z.string().default(''),
  limit: z
    .string()
    .regex(/^-?\d+$/, { error: 'limit must be an integer' })
    .transform(Number)
    .optional(),
})

/** GET /api/search/candidates — the brand or name typed in the picker. */
export const candidatesQuerySchema = z.object({
  q: z.string().trim().default(''),
})

/**
 * POST /api/product-references — a visitor's "this reference belongs to that
 * product" answer (issue #320). A value made only of separators is left to
 * the database, whose normalization rule rejects it.
 */
export const referenceAttachmentSchema = z.object(
  {
    productId: uuid('Invalid reference: a valid productId is required'),
    value: z
      .string({ error: 'Invalid reference: the value needs at least one letter or digit' })
      .trim()
      .regex(/[\p{L}\p{N}]/u, { error: 'Invalid reference: the value needs at least one letter or digit' })
      .max(MAX_REFERENCE_LENGTH, { error: `Invalid reference: at most ${MAX_REFERENCE_LENGTH} characters` }),
  },
  { error: 'Invalid reference: body must be a JSON object' },
)

export type ReferenceAttachment = z.output<typeof referenceAttachmentSchema>
