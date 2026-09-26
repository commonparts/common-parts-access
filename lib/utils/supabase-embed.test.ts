import { describe, expect, it } from 'vitest'

import { firstEmbedded } from './supabase-embed'

describe('firstEmbedded', () => {
  const brand = { name: 'Bosch', slug: 'bosch' }

  it('returns a to-one embed object as is', () => {
    expect(firstEmbedded(brand)).toBe(brand)
  })

  it('returns the first row of an array embed', () => {
    expect(firstEmbedded([brand, { name: 'Miele', slug: 'miele' }])).toBe(brand)
  })

  it('returns null for an empty array', () => {
    expect(firstEmbedded([])).toBeNull()
  })

  it('returns null for null and undefined', () => {
    expect(firstEmbedded(null)).toBeNull()
    expect(firstEmbedded(undefined)).toBeNull()
  })
})
