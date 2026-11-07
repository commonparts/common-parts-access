import { describe, expect, it } from 'vitest'

import { buildBreadcrumbJsonLd, localizedPageMetadata, localizedUrl } from '@/lib/utils/seo'
import { absoluteAppUrl } from '@/lib/utils/validation'

describe('localizedUrl', () => {
  it('prefixes the path with the locale', () => {
    expect(localizedUrl('/browse', 'fr')).toBe(absoluteAppUrl('/fr/browse'))
    expect(localizedUrl('/', 'en')).toBe(absoluteAppUrl('/en'))
  })
})

describe('localizedPageMetadata', () => {
  it('sets the canonical and Open Graph URLs in the locale, over the page fields', () => {
    const url = absoluteAppUrl('/fr/parts/knob')
    expect(localizedPageMetadata('/parts/knob', 'fr', { title: 'Knob', url: '/parts/knob' })).toEqual({
      alternates: { canonical: url },
      openGraph: { title: 'Knob', url },
    })
  })

  it('declares no hreflang alternates', () => {
    expect(localizedPageMetadata('/', 'en').alternates).not.toHaveProperty('languages')
  })
})

describe('buildBreadcrumbJsonLd', () => {
  it('localizes the page and item URLs', () => {
    const jsonLd = buildBreadcrumbJsonLd('/brands/bosch', [{ name: 'Home', path: '/' }, { name: 'Bosch' }], 'fr')
    expect(jsonLd['@id']).toBe(`${absoluteAppUrl('/fr/brands/bosch')}#breadcrumb`)
    expect(jsonLd.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteAppUrl('/fr') },
      { '@type': 'ListItem', position: 2, name: 'Bosch' },
    ])
  })
})
