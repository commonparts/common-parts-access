import { z } from 'zod'
import { uuid } from '@/lib/schemas/common'

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
const cleanText = z
  .string()
  .nullish()
  .transform((value) => value?.replace(CONTROL_CHARS, '').trim() || null)

/** `cleanText` of at most `max` characters, the bound checked after cleaning. */
function boundedText(max: number) {
  return cleanText.pipe(z.string().max(max).nullable())
}

export const partRequestSchema = z.object({
  description: cleanText.pipe(z.string().min(DESCRIPTION_MIN_LENGTH).max(DESCRIPTION_MAX_LENGTH)),
  rawQuery: boundedText(RAW_QUERY_MAX_LENGTH),
  pageUrl: boundedText(PAGE_URL_MAX_LENGTH),
  productId: cleanText.pipe(uuid.nullable()),
})

export type PartRequestInput = z.output<typeof partRequestSchema>
