import { describe, expect, it } from 'vitest'
import {
  groupProductReferences,
  pickRegionalName,
  type ProductReference,
} from './product-references'

function reference(overrides: Partial<ProductReference>): ProductReference {
  return {
    id: overrides.value ?? 'id',
    value: 'value',
    type: 'commercial_name',
    region: null,
    language: null,
    ...overrides,
  }
}

const references: ProductReference[] = [
  reference({ value: 'QP6520/20', type: 'manufacturer_ref' }),
  reference({ value: 'OneBlade Pro 360', region: 'US' }),
  reference({ value: 'OneBlade Pro Alias' }),
  reference({ value: '8710103900000', type: 'ean' }),
]

describe('pickRegionalName', () => {
  // Acceptance case of issue #316: the regional name reaches that region only.
  it('returns the commercial name of the visitor region', () => {
    expect(pickRegionalName(references, { language: 'en', region: 'US' })).toBe('OneBlade Pro 360')
  })

  it('returns null for visitors of other regions', () => {
    expect(pickRegionalName(references, { language: 'fr', region: 'FR' })).toBeNull()
  })

  it('returns null when the visitor region is unknown', () => {
    expect(pickRegionalName(references, { language: 'en', region: null })).toBeNull()
  })

  it('never lets a region-less commercial name replace the canonical name', () => {
    const aliasOnly = [reference({ value: 'Alias' })]
    expect(pickRegionalName(aliasOnly, { language: 'en', region: 'US' })).toBeNull()
  })

  it('prefers the visitor language within a region, then no language', () => {
    const belgium = [
      reference({ value: 'Nom FR', region: 'BE', language: 'fr-BE' }),
      reference({ value: 'Naam NL', region: 'BE', language: 'nl' }),
      reference({ value: 'Neutral', region: 'BE' }),
    ]
    expect(pickRegionalName(belgium, { language: 'nl', region: 'BE' })).toBe('Naam NL')
    expect(pickRegionalName(belgium, { language: 'fr', region: 'BE' })).toBe('Nom FR')
    expect(pickRegionalName(belgium, { language: 'de', region: 'BE' })).toBe('Neutral')
  })
})

describe('groupProductReferences', () => {
  it('groups by type in display order and hides the displayed name', () => {
    const groups = groupProductReferences(references, 'OneBlade Pro 360')
    expect(groups.map((group) => [group.type, group.references.map((r) => r.value)])).toEqual([
      ['manufacturer_ref', ['QP6520/20']],
      ['commercial_name', ['OneBlade Pro Alias']],
      ['ean', ['8710103900000']],
    ])
  })

  it('returns nothing for a product without references', () => {
    expect(groupProductReferences([], 'OneBlade Pro')).toEqual([])
  })
})
