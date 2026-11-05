import { z } from 'zod'
import { isValidUuid } from '@/lib/utils/validation'

/**
 * Part demand ("Request this part"), submitted through the `requestPart`
 * Server Action. The bounds mirror the CHECK constraints on part_requests, so
 * bad input is rejected before the round trip. A non-empty `description` is the core demand
 * signal and is required; everything else is optional context.
 */

const DESCRIPTION_MIN_LENGTH = 2
const DESCRIPTION_MAX_LENGTH = 500
const RAW_QUERY_MAX_LENGTH = 200
const PAGE_URL_MAX_LENGTH = 2048
// ASCII control characters (C0 range plus DEL) are stripped from all text.
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g

/** Strips control characters and trims; blank or absent reads as null. */
function cleanText(message: string) {
  return z
    .string({ error: message })
    .nullish()
    .transform((value) => value?.replace(CONTROL_CHARS, '').trim() || null)
}

export const partRequestSchema = z.object(
  {
    description: cleanText('Description is required')
      .refine((value) => value !== null, { error: 'Description is required' })
      .refine((value) => (value?.length ?? 0) >= DESCRIPTION_MIN_LENGTH, {
        error: `Description must be at least ${DESCRIPTION_MIN_LENGTH} characters`,
      })
      .refine((value) => (value?.length ?? 0) <= DESCRIPTION_MAX_LENGTH, {
        error: `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters`,
      })
      .transform((value) => value ?? ''),
    rawQuery: cleanText('Search term must be text').refine(
      (value) => !value || value.length <= RAW_QUERY_MAX_LENGTH,
      { error: `Search term must be at most ${RAW_QUERY_MAX_LENGTH} characters` },
    ),
    pageUrl: cleanText('Page URL must be text').refine((value) => !value || value.length <= PAGE_URL_MAX_LENGTH, {
      error: `Page URL must be at most ${PAGE_URL_MAX_LENGTH} characters`,
    }),
    productId: cleanText('Invalid product id').refine((value) => !value || isValidUuid(value), {
      error: 'Invalid product id',
    }),
  },
  { error: 'Invalid request body' },
)

export type PartRequestInput = z.output<typeof partRequestSchema>
