import { describe, expect, it } from 'vitest'

import { parseFeatureFlag } from './feature-flags'

describe('parseFeatureFlag', () => {
  it('is on for "true", ignoring case and surrounding spaces', () => {
    expect(parseFeatureFlag('true')).toBe(true)
    expect(parseFeatureFlag(' TRUE ')).toBe(true)
  })

  it('is off when unset or empty', () => {
    expect(parseFeatureFlag(undefined)).toBe(false)
    expect(parseFeatureFlag('')).toBe(false)
  })

  it('is off for any other value', () => {
    expect(parseFeatureFlag('false')).toBe(false)
    expect(parseFeatureFlag('1')).toBe(false)
    expect(parseFeatureFlag('yes')).toBe(false)
  })
})
