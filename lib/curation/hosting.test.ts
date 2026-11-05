import { describe, expect, it } from 'vitest'
import { validate } from '@/lib/api/parse'
import { CURATED_HOSTED_ERROR, curatedHostingTypeSchema } from './hosting'

describe('curatedHostingTypeSchema', () => {
  it('defaults to link_out when the field is null or empty', () => {
    expect(validate(curatedHostingTypeSchema, null)).toEqual({ ok: true, data: 'link_out' })
    expect(validate(curatedHostingTypeSchema, '')).toEqual({ ok: true, data: 'link_out' })
    expect(validate(curatedHostingTypeSchema, '   ')).toEqual({ ok: true, data: 'link_out' })
  })

  it('accepts link_out', () => {
    expect(validate(curatedHostingTypeSchema, 'link_out')).toEqual({ ok: true, data: 'link_out' })
    expect(validate(curatedHostingTypeSchema, ' link_out ')).toEqual({ ok: true, data: 'link_out' })
  })

  // A part published elsewhere is always referenced (#396).
  it('rejects hosted with an actionable error', () => {
    expect(validate(curatedHostingTypeSchema, 'hosted')).toEqual({ ok: false, error: CURATED_HOSTED_ERROR })
    expect(CURATED_HOSTED_ERROR).toContain('link_out')
  })

  it('rejects unknown values and non-strings', () => {
    expect(validate(curatedHostingTypeSchema, 'upload')).toEqual({ ok: false, error: 'Invalid file hosting type' })
    expect(validate(curatedHostingTypeSchema, 1)).toEqual({ ok: false, error: 'Invalid file hosting type' })
    expect(validate(curatedHostingTypeSchema, {})).toEqual({ ok: false, error: 'Invalid file hosting type' })
  })
})
