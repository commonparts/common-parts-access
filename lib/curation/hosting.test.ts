import { describe, expect, it } from 'vitest'
import { validate } from '@/lib/api/parse'
import { curatedHostingTypeSchema } from './hosting'

describe('curatedHostingTypeSchema', () => {
  it('defaults to link_out when the field is null or empty', async () => {
    expect(await validate(curatedHostingTypeSchema, null)).toEqual({ ok: true, data: 'link_out' })
    expect(await validate(curatedHostingTypeSchema, '')).toEqual({ ok: true, data: 'link_out' })
    expect(await validate(curatedHostingTypeSchema, '   ')).toEqual({ ok: true, data: 'link_out' })
  })

  it('accepts link_out', async () => {
    expect(await validate(curatedHostingTypeSchema, 'link_out')).toEqual({ ok: true, data: 'link_out' })
    expect(await validate(curatedHostingTypeSchema, ' link_out ')).toEqual({ ok: true, data: 'link_out' })
  })

  // A part published elsewhere is always referenced (#396).
  it('rejects hosted with an actionable error', async () => {
    const hosted = await validate(curatedHostingTypeSchema, 'hosted')
    expect(!hosted.ok && hosted.error).toContain('link_out')
  })

  it('rejects unknown values and non-strings', async () => {
    expect(await validate(curatedHostingTypeSchema, 'upload')).toEqual({ ok: false, error: 'Invalid file hosting type' })
    expect((await validate(curatedHostingTypeSchema, 1)).ok).toBe(false)
    expect((await validate(curatedHostingTypeSchema, {})).ok).toBe(false)
  })
})
