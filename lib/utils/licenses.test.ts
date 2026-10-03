import { describe, expect, it } from 'vitest'
import { isHostableLicense, isNoDerivativesLicense } from './licenses'

describe('isNoDerivativesLicense', () => {
  it('matches CC NoDerivatives variants', () => {
    expect(isNoDerivativesLicense('CC-BY-ND-4.0')).toBe(true)
    expect(isNoDerivativesLicense('CC-BY-NC-ND-4.0')).toBe(true)
  })

  it('does not match non-ND licenses', () => {
    expect(isNoDerivativesLicense('CC-BY-4.0')).toBe(false)
    expect(isNoDerivativesLicense('CC-BY-NC-SA-4.0')).toBe(false)
    expect(isNoDerivativesLicense('MIT')).toBe(false)
    expect(isNoDerivativesLicense('GPL-3.0-only')).toBe(false)
  })

  it('matches ND only as a whole dash-delimited segment', () => {
    expect(isNoDerivativesLicense('BRAND-1.0')).toBe(false)
    expect(isNoDerivativesLicense('NDL-2.0')).toBe(false)
  })
})

describe('isHostableLicense', () => {
  const base = { allowsCommercial: true, allowsRedistribution: true }

  it('accepts open licenses', () => {
    expect(isHostableLicense({ spdxId: 'CC-BY-4.0', ...base })).toBe(true)
    expect(isHostableLicense({ spdxId: 'CC0-1.0', ...base })).toBe(true)
    expect(isHostableLicense({ spdxId: 'MIT', ...base })).toBe(true)
  })

  it('rejects NC licenses via the commercial flag', () => {
    expect(isHostableLicense({ spdxId: 'CC-BY-NC-4.0', ...base, allowsCommercial: false })).toBe(false)
  })

  it('rejects ND licenses even when the flags alone would pass', () => {
    // CC-BY-ND allows redistribution of the unmodified work, so the flag
    // pair is true/true — the SPDX check must still exclude it.
    expect(isHostableLicense({ spdxId: 'CC-BY-ND-4.0', ...base })).toBe(false)
  })

  it('rejects licenses that forbid redistribution', () => {
    expect(isHostableLicense({ spdxId: 'Proprietary', ...base, allowsRedistribution: false })).toBe(false)
  })
})
