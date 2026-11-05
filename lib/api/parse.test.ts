import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { parseJsonBody, parseSearchParams, validate } from './parse'

const schema = z.object({
  title: z.string().min(3, { error: 'Title must be at least 3 characters' }),
  unit: z.enum(['mm', 'cm']).optional(),
})

describe('validate', () => {
  it('keeps a message written in the schema', () => {
    expect(validate(schema, { title: 'ab' })).toEqual({ ok: false, error: 'Title must be at least 3 characters' })
  })

  it('names the field in front of a default message', () => {
    const result = validate(schema, { title: 'Hinge', unit: 'in' })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toMatch(/^unit: /)
  })

  it('returns the parsed value', () => {
    expect(validate(schema, { title: 'Hinge' })).toEqual({ ok: true, data: { title: 'Hinge' } })
  })
})

describe('parseJsonBody', () => {
  function post(body: string): Request {
    return new Request('http://localhost/api', { method: 'POST', body })
  }

  it('answers 400 with the given message when the body is not JSON', async () => {
    const result = await parseJsonBody(post('{'), schema, 'Invalid JSON body')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.response.status).toBe(400)
    expect(await result.response.json()).toEqual({ error: 'Invalid JSON body' })
  })

  it('answers 400 naming the invalid field', async () => {
    const result = await parseJsonBody(post('{"title":"ab"}'), schema)
    if (result.ok) throw new Error('expected a refusal')
    expect(await result.response.json()).toEqual({ error: 'Title must be at least 3 characters' })
  })

  it('returns the parsed body', async () => {
    expect(await parseJsonBody(post('{"title":"Hinge"}'), schema)).toEqual({ ok: true, data: { title: 'Hinge' } })
  })
})

describe('parseSearchParams', () => {
  const query = z.object({ q: z.string().default(''), page: z.string().optional() })

  it('reads absent parameters as undefined so defaults apply', () => {
    expect(parseSearchParams(new URLSearchParams(''), query)).toEqual({ ok: true, data: { q: '' } })
  })

  it('reads the last value of a repeated parameter', () => {
    expect(parseSearchParams(new URLSearchParams('q=a&q=b'), query)).toEqual({ ok: true, data: { q: 'b' } })
  })
})
