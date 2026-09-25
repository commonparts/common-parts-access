import { describe, expect, it } from 'vitest'
import { toEvidenceLevel } from './evidence-level'

describe('toEvidenceLevel', () => {
  it('keeps every known level', () => {
    expect(toEvidenceLevel('declared')).toBe('declared')
    expect(toEvidenceLevel('confirmed')).toBe('confirmed')
    expect(toEvidenceLevel('disputed')).toBe('disputed')
  })

  // An unknown value must never be displayed as stronger evidence.
  it('falls back to declared for anything else', () => {
    expect(toEvidenceLevel(undefined)).toBe('declared')
    expect(toEvidenceLevel(null)).toBe('declared')
    expect(toEvidenceLevel('certified')).toBe('declared')
    expect(toEvidenceLevel('CONFIRMED')).toBe('declared')
  })
})
