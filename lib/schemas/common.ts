import { z } from 'zod'
import { routing } from '@/i18n/routing'
import { isValidHttpUrl, isValidUuid } from '@/lib/utils/validation'

/**
 * Building blocks of the request schemas (issue #483). Each takes the message
 * the API answers when the value is invalid, so a 400 names the field in the
 * words the interface already uses.
 */

/**
 * The interface locale of the page calling a read whose response it displays
 * (#502): API routes are not localized, so the page names its locale.
 */
export const locale = z.enum(routing.locales).default(routing.defaultLocale)

/** GET routes whose only parameter is the locale of the calling page. */
export const localeQuerySchema = z.object({ locale })

/** Longest URL the API stores (source URL, author URL, page URL). */
export const URL_MAX_LENGTH = 2048

/** A UUID in canonical 8-4-4-4-12 form, any version, surrounding spaces trimmed. */
export function uuid(message: string) {
  return z.string({ error: message }).trim().refine(isValidUuid, { error: message })
}

/** An http(s) URL of at most URL_MAX_LENGTH characters, trimmed. */
export function httpUrl(message: string) {
  return z
    .string({ error: message })
    .trim()
    .max(URL_MAX_LENGTH, { error: message })
    .refine(isValidHttpUrl, { error: message })
}

/**
 * A string trimmed and bounded to `max` characters, where blank means "no
 * value": it parses to null, the value the column takes when cleared.
 */
export function clearableText(max: number, messages: { type: string; tooLong: string }) {
  return z
    .string({ error: messages.type })
    .trim()
    .max(max, { error: messages.tooLong })
    .transform((value) => value || null)
}

/**
 * A JSON array of unique UUIDs, at most `max` of them. The whole list is
 * refused when one entry is malformed or repeated, rather than silently
 * dropping it: a link list stored without an entry the caller sent would
 * report a corrupted state as a success.
 */
export function uuidList(max: number, messages: { invalid: string; tooMany: string }) {
  return z
    .array(z.string({ error: messages.invalid }).refine(isValidUuid, { error: messages.invalid }), {
      error: messages.invalid,
    })
    .max(max, { error: messages.tooMany })
    .refine((ids) => new Set(ids).size === ids.length, { error: messages.invalid })
}

/** A 1-based page number from a query parameter; absent reads as 1. */
export const pageParam = z
  .string()
  .regex(/^\d+$/, { error: 'page must be a positive integer' })
  .transform(Number)
  .pipe(z.number().int().min(1, { error: 'page must be a positive integer' }))
  .default(1)

/** A UUID filter of a list query; an absent or empty value means no filter. */
export function optionalUuidParam(name: string) {
  return z
    .string()
    .trim()
    .pipe(z.union([z.literal('').transform(() => undefined), uuid(`${name} must be a UUID`)]))
    .optional()
}

/** An integer query parameter between 1 and `max`; absent reads as `fallback`. */
export function boundedIntParam(name: string, max: number, fallback: number) {
  const message = `${name} must be an integer between 1 and ${max}`
  return z
    .string()
    .regex(/^\d+$/, { error: message })
    .transform(Number)
    .pipe(z.number().int().min(1, { error: message }).max(max, { error: message }))
    .default(fallback)
}
