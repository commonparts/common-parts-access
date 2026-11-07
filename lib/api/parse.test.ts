import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { parseJsonBody, parseSearchParams, validate } from './parse'

const schema = z.object({
  title: z.string().min(3),
  unit: z.enum(['mm', 'cm']).optional(),
  attested: z.literal(true, { error: 'attestationRequired' }).optional(),
})

function post(body: string, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api', { method: 'POST', body, headers })
}

/** The message of a refused parse, which must be a 400. */
async function errorOf(result: Promise<{ ok: true } | { ok: false; response: Response }>): Promise<string> {
  const parsed = await result
  if (parsed.ok) throw new Error('expected a refusal')
  expect(parsed.response.status).toBe(400)
  return (await parsed.response.json()).error
}

describe('validate', () => {
  it('names the field in front of the default message', async () => {
    expect(await validate(schema, { title: 'ab' })).toEqual({
      ok: false,
      error: 'Title: Too small: expected string to have >=3 characters',
    })
  })

  it('translates a message key written in the schema', async () => {
    expect(await validate(schema, { title: 'Hinge', attested: false })).toEqual({
      ok: false,
      error: 'Originality declaration: Must be confirmed to start an upload',
    })
  })

  it('reads a missing field as required and shows an unlabelled field by its name', async () => {
    expect(await validate(z.object({ size: z.number(), extra: z.number() }), { size: 1 })).toEqual({
      ok: false,
      error: 'extra: Required',
    })
  })

  it('passes the params of a custom issue to its message', async () => {
    const forbidden = z.object({}).superRefine((_, ctx) => {
      ctx.addIssue({ code: 'custom', message: 'forbiddenUploadField', params: { field: 'sourceUrl' } })
    })
    const result = await validate(forbidden, {})
    expect(!result.ok && result.error).toMatch(/^"sourceUrl" cannot be set through the upload flow/)
  })

  it('returns the parsed value', async () => {
    expect(await validate(schema, { title: 'Hinge' })).toEqual({ ok: true, data: { title: 'Hinge' } })
  })
})

describe('parseJsonBody', () => {
  it('answers 400 when the body is not JSON', async () => {
    const request = post('{', { 'accept-language': 'en-GB' })
    expect(await errorOf(parseJsonBody(request, schema))).toBe('Invalid request body: expected JSON')
  })

  it('answers in the default locale when the request names none', async () => {
    expect(await errorOf(parseJsonBody(post('{'), schema))).toBe('Invalid request body: expected JSON')
  })

  it('answers in the locale of the locale cookie', async () => {
    const request = post('{"title":"Hinge","unit":"in"}', { cookie: 'NEXT_LOCALE=fr' })
    expect(await errorOf(parseJsonBody(request, schema))).toBe(
      'Unité : Option invalide : une valeur parmi "mm"|"cm" attendue',
    )
  })

  it('answers in the preferred supported language without a cookie', async () => {
    const request = post('{"title":"ab"}', { 'accept-language': 'de-DE, fr;q=0.8, en;q=0.5' })
    expect(await errorOf(parseJsonBody(request, schema))).toMatch(/^Titre : Trop petit/)
  })

  it('returns the parsed body', async () => {
    expect(await parseJsonBody(post('{"title":"Hinge"}'), schema)).toEqual({ ok: true, data: { title: 'Hinge' } })
  })
})

describe('parseSearchParams', () => {
  const query = z.object({ q: z.string().default(''), page: z.string().optional() })
  const get = (search: string) => new Request(`http://localhost/api${search}`)

  it('reads absent parameters as undefined so defaults apply', async () => {
    expect(await parseSearchParams(get(''), query)).toEqual({ ok: true, data: { q: '' } })
  })

  it('reads the last value of a repeated parameter', async () => {
    expect(await parseSearchParams(get('?q=a&q=b'), query)).toEqual({ ok: true, data: { q: 'b' } })
  })
})
