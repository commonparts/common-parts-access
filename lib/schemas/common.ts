import { z } from 'zod'
import { routing } from '@/i18n/routing'
import { isValidHttpUrl, isValidUuid } from '@/lib/utils/validation'

/**
 * Building blocks of the request schemas (issue #483). Their messages are
 * Zod's defaults or `Validation` keys, named after the field by lib/api/parse.ts.
 */

/**
 * The interface locale of the page calling a read whose response it displays
 * (#502): API routes are not localized, so the page names its locale. A
 * request that names none gets English, the source, as before #502 and like
 * the database functions.
 */
export const locale = z.enum(routing.locales).default('en')

/** GET routes whose only parameter is the locale of the calling page. */
export const localeQuerySchema = z.object({ locale })

/** Longest URL the API stores (source URL, author URL, page URL). */
export const URL_MAX_LENGTH = 2048

/** A UUID in canonical 8-4-4-4-12 form, any version, surrounding spaces trimmed. */
export const uuid = z.string().trim().refine(isValidUuid, { error: 'uuid' })

/** An http(s) URL of at most URL_MAX_LENGTH characters, trimmed. */
export const httpUrl = z.string().trim().max(URL_MAX_LENGTH).refine(isValidHttpUrl, { error: 'httpUrl' })

/**
 * A string trimmed and bounded to `max` characters, where blank means "no
 * value": it parses to null, the value the column takes when cleared.
 */
export function clearableText(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
}

/**
 * A JSON array of unique UUIDs, at most `max` of them. The whole list is
 * refused when one entry is malformed or repeated, rather than silently
 * dropping it: a link list stored without an entry the caller sent would
 * report a corrupted state as a success.
 */
export function uuidList(max: number) {
  return z
    .array(uuid)
    .max(max)
    .refine((ids) => new Set(ids).size === ids.length, { error: 'duplicateIds' })
}

/** A 1-based page number from a query parameter; absent reads as 1. */
export const pageParam = boundedIntParam(Number.MAX_SAFE_INTEGER, 1)

/** A UUID filter of a list query; an absent or empty value means no filter. */
export const optionalUuidParam = z
  .string()
  .trim()
  .pipe(z.union([z.literal('').transform(() => undefined), uuid]))
  .optional()

/** An integer query parameter between 1 and `max`; absent reads as `fallback`. */
export function boundedIntParam(max: number, fallback: number) {
  return z.coerce.number().int().min(1).max(max).default(fallback)
}
