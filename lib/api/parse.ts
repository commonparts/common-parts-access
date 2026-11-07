import { NextResponse } from 'next/server'
import type { Locale, Messages } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'
import { z } from 'zod'
import { requestLocale } from '@/lib/utils/locale'

/**
 * Request validation for the API routes and Server Actions (#483), in the
 * locale of the calling page (#500).
 *
 * Every route parses its JSON body and its query parameters through a Zod
 * schema with these helpers, and answers a 400 naming the invalid field when
 * the input does not match. The TypeScript type of a payload is the schema's
 * output (`z.infer`), never a second declaration kept in sync by hand.
 */

/** Outcome of a validation or a Server Action: the value, or the message to show. */
export type Result<T> = { ok: true; data: T } | { ok: false; error: string }

/** Result of a parse: the validated value, or the 400 response to return as is. */
export type ParseResult<T> = { ok: true; data: T } | { ok: false; response: NextResponse }

/**
 * A message of the `Validation` namespace. A schema that needs more than
 * Zod's default message writes one of these keys as its `error`, and passes
 * the message's arguments as the issue's `params`.
 */
type ValidationKey = keyof Messages['Validation']

type FieldKey = keyof Messages['Fields']

/**
 * Validates `input` against `schema` in `locale`. Returns the parsed value, or
 * the message of the first issue: the `Validation` message its key names, or
 * Zod's default message in `locale`, after the label of the field when the
 * issue has one (`Unité : Option invalide : une valeur parmi "mm"|"cm" attendue`).
 * A path segment without a `Fields` label is shown as is.
 */
async function validateIn<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
  locale: Locale,
): Promise<Result<z.output<Schema>>> {
  const defaultMessage = z.locales[locale]().localeError
  // A field missing where one is expected reads "Required" rather than
  // Zod's "expected string, received undefined".
  const result = schema.safeParse(input, {
    error: (issue) =>
      issue.code === 'invalid_type' && issue.input == null && issue.path?.length ? 'required' : defaultMessage(issue),
  })
  if (result.success) return { ok: true, data: result.data }

  const [t, fields] = await Promise.all([
    getTranslations({ locale, namespace: 'Validation' }),
    getTranslations({ locale, namespace: 'Fields' }),
  ])
  const issue = result.error.issues[0]
  if (!issue) return { ok: false, error: t('invalidRequest') }

  // A message written in a schema is a key (see ValidationKey); any other is
  // Zod's default. Path segments are the field names the schemas chose.
  const key = issue.message as ValidationKey
  const message = t.has(key) ? t(key, issue.code === 'custom' ? issue.params : undefined) : issue.message
  const field = issue.path
    .filter((segment) => typeof segment === 'string')
    .map((segment) => (fields.has(segment as FieldKey) ? fields(segment as FieldKey) : segment))
    .join(' › ')
  return { ok: false, error: field ? t('field', { field, message }) : message }
}

/**
 * Validates the argument of a Server Action, in the locale of the page that
 * called it. Does not throw.
 */
export async function validate<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): Promise<Result<z.output<Schema>>> {
  return validateIn(schema, input, await getLocale())
}

function badRequest(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 400 })
}

/**
 * Parses the JSON body of a request against `schema`, in the locale of the
 * calling page. A body that is not JSON answers the `invalidJson` message; a
 * body that does not match the schema answers the message of the first
 * issue. Both are 400s.
 */
export async function parseJsonBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<ParseResult<z.output<Schema>>> {
  const locale = requestLocale(request)
  let body: unknown
  try {
    body = await request.json()
  } catch {
    const t = await getTranslations({ locale, namespace: 'Validation' })
    return { ok: false, response: badRequest(t('invalidJson')) }
  }
  const result = await validateIn(schema, body, locale)
  return result.ok ? result : { ok: false, response: badRequest(result.error) }
}

/**
 * Parses the query parameters of a request against `schema`, in the locale of
 * the calling page. Each parameter reaches the schema as a string (the last
 * value when it is repeated), and an absent one as undefined, so defaults are
 * declared in the schema.
 */
export async function parseSearchParams<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
): Promise<ParseResult<z.output<Schema>>> {
  const query = Object.fromEntries(new URL(request.url).searchParams)
  const result = await validateIn(schema, query, requestLocale(request))
  return result.ok ? result : { ok: false, response: badRequest(result.error) }
}
