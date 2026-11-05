import { NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Request validation for the API routes (issue #483).
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

const defaultMessage = z.locales.en().localeError

/**
 * Error map for the fields that carry no message of their own: Zod's default
 * message, prefixed with the path of the field, so every 400 names what to
 * fix (`dimensions.unit: Invalid option: expected one of "mm"|"cm"|"in"`).
 * A message written in a schema is kept as is: those name their field already.
 */
const fieldErrorMap: z.core.$ZodErrorMap = (issue) => {
  const fallback = defaultMessage(issue)
  const message = typeof fallback === 'string' ? fallback : fallback?.message
  if (!message) return undefined
  return issue.path && issue.path.length > 0 ? `${issue.path.join('.')}: ${message}` : message
}

/**
 * Validates `input` against `schema`. Returns the parsed value, or the message
 * of the first issue. Does not throw. Server Actions call it directly;
 * routes use the helpers below.
 */
export function validate<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): Result<z.output<Schema>> {
  const result = schema.safeParse(input, { error: fieldErrorMap })
  if (result.success) return { ok: true, data: result.data }
  return { ok: false, error: result.error.issues[0]?.message ?? 'Invalid request' }
}

function badRequest(error: string): NextResponse {
  return NextResponse.json({ error }, { status: 400 })
}

/**
 * Parses the JSON body of a request against `schema`. A body that is not JSON
 * answers `invalidJsonMessage`; a body that does not match the schema answers
 * the message of the first issue. Both are 400s.
 */
export async function parseJsonBody<Schema extends z.ZodType>(
  request: Request,
  schema: Schema,
  invalidJsonMessage = 'Invalid request body: expected JSON',
): Promise<ParseResult<z.output<Schema>>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return { ok: false, response: badRequest(invalidJsonMessage) }
  }
  const result = validate(schema, body)
  return result.ok ? result : { ok: false, response: badRequest(result.error) }
}

/**
 * Parses the query parameters of a request against `schema`. Each parameter
 * reaches the schema as a string (the last value when it is repeated), and an
 * absent one as undefined, so defaults are declared in the schema.
 */
export function parseSearchParams<Schema extends z.ZodType>(
  searchParams: URLSearchParams,
  schema: Schema,
): ParseResult<z.output<Schema>> {
  const result = validate(schema, Object.fromEntries(searchParams))
  return result.ok ? result : { ok: false, response: badRequest(result.error) }
}
