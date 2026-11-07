import { describe, expect, it } from 'vitest'
import { formatLocaleTag, localizeCategory, parseAcceptLanguage } from './locale'

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

describe('formatLocaleTag', () => {
  it('joins language and region', () => {
    expect(formatLocaleTag({ language: 'fr', region: 'FR' })).toBe('fr-FR')
  })

  it('keeps the language alone when no region is known', () => {
    expect(formatLocaleTag({ language: 'de', region: null })).toBe('de')
  })

  it('returns null without a language', () => {
    expect(formatLocaleTag({ language: null, region: null })).toBeNull()
  })
})

describe('localizeCategory', () => {
  const vacuum = { slug: 'vacuum-cleaner', name: 'Vacuum Cleaner', name_fr: 'Aspirateur' }

  it('names the category in French on a French page, without name_fr', () => {
    expect(localizeCategory(vacuum, 'fr')).toEqual({ slug: 'vacuum-cleaner', name: 'Aspirateur' })
  })

  it('keeps the English name on an English page', () => {
    expect(localizeCategory(vacuum, 'en')).toEqual({ slug: 'vacuum-cleaner', name: 'Vacuum Cleaner' })
  })

  it('falls back to the English name when the French one is missing', () => {
    expect(localizeCategory({ ...vacuum, name_fr: null }, 'fr').name).toBe('Vacuum Cleaner')
  })

  it('passes a missing category through', () => {
    expect(localizeCategory(null, 'fr')).toBeNull()
  })
})
