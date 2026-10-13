import { describe, expect, it } from 'vitest'
import { CURATED_HOSTED_ERROR, parseCuratedHostingType } from './hosting'

describe('parseCuratedHostingType', () => {
  it('defaults to link_out when the field is absent or empty', () => {
    expect(parseCuratedHostingType(undefined)).toEqual({ ok: true, value: 'link_out' })
    expect(parseCuratedHostingType(null)).toEqual({ ok: true, value: 'link_out' })
    expect(parseCuratedHostingType('')).toEqual({ ok: true, value: 'link_out' })
    expect(parseCuratedHostingType('   ')).toEqual({ ok: true, value: 'link_out' })
  })

  it('accepts link_out', () => {
    expect(parseCuratedHostingType('link_out')).toEqual({ ok: true, value: 'link_out' })
    expect(parseCuratedHostingType(' link_out ')).toEqual({ ok: true, value: 'link_out' })
  })

  // A part published elsewhere is always referenced (#396).
  it('rejects hosted with an actionable error', () => {
    const result = parseCuratedHostingType('hosted')
    expect(result).toEqual({ ok: false, error: CURATED_HOSTED_ERROR })
    expect(CURATED_HOSTED_ERROR).toContain('link_out')
  })

  it('rejects unknown values and non-strings', () => {
    expect(parseCuratedHostingType('upload')).toEqual({ ok: false, error: 'Invalid file hosting type' })
    expect(parseCuratedHostingType(1)).toEqual({ ok: false, error: 'Invalid file hosting type' })
    expect(parseCuratedHostingType({})).toEqual({ ok: false, error: 'Invalid file hosting type' })
  })
})
