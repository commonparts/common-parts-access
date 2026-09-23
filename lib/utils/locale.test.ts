import { describe, expect, it } from 'vitest'
import { parseAcceptLanguage } from './locale'

describe('parseAcceptLanguage', () => {
  it('reads language and region from a single tag', () => {
    expect(parseAcceptLanguage('fr-FR')).toEqual({ language: 'fr', region: 'FR' })
  })

  it('takes the region from the most preferred tag that states one', () => {
    expect(parseAcceptLanguage('fr, en-GB;q=0.8, de-DE;q=0.9')).toEqual({
      language: 'fr',
      region: 'DE',
    })
  })

  it('orders by q rather than header position', () => {
    expect(parseAcceptLanguage('en-US;q=0.5, nl-BE')).toEqual({ language: 'nl', region: 'BE' })
  })

  it('skips script subtags when looking for the region', () => {
    expect(parseAcceptLanguage('zh-Hant-TW')).toEqual({ language: 'zh', region: 'TW' })
  })

  it('returns no region when no tag states one', () => {
    expect(parseAcceptLanguage('fr, en;q=0.5')).toEqual({ language: 'fr', region: null })
  })

  it('ignores wildcards, refused tags and malformed entries', () => {
    expect(parseAcceptLanguage('*, en-US;q=0, ??, de-AT;q=0.3')).toEqual({
      language: 'de',
      region: 'AT',
    })
  })

  it('handles a missing or empty header', () => {
    expect(parseAcceptLanguage(null)).toEqual({ language: null, region: null })
    expect(parseAcceptLanguage('')).toEqual({ language: null, region: null })
  })
})
