import { z } from 'zod'
import { locale, uuid } from '@/lib/schemas/common'
import { MAX_REFERENCE_LENGTH } from '@/lib/utils/product-references'

/** Request schemas of the search endpoints. */

/**
 * GET /api/search — `q` is any text (searchAll() trims and truncates it);
 * `limit` is an integer, clamped by searchAll() to the allowed range;
 * `locale` names the category of each product hit.
 */
export const searchQuerySchema = z.object({
  q: z.string().default(''),
  locale,
  limit: z.coerce.number().int().optional(),
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
export const referenceAttachmentSchema = z.object({
  productId: uuid,
  value: z
    .string()
    .trim()
    .regex(/[\p{L}\p{N}]/u, { error: 'letterOrDigit' })
    .max(MAX_REFERENCE_LENGTH),
})

export type ReferenceAttachment = z.output<typeof referenceAttachmentSchema>
