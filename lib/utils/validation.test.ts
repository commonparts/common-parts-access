import { describe, expect, it } from 'vitest'
import { normalizeEntityName } from './validation'

describe('normalizeEntityName', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizeEntityName('  OneBlade Pro 360  ')).toBe('OneBlade Pro 360')
  })

  it('collapses internal whitespace runs to single spaces', () => {
    expect(normalizeEntityName('OneBlade   Pro  360')).toBe('OneBlade Pro 360')
  })

  it('normalizes tabs and newlines like spaces', () => {
    expect(normalizeEntityName('OneBlade\tPro\n360')).toBe('OneBlade Pro 360')
    expect(normalizeEntityName(' \t OneBlade \n Pro \t ')).toBe('OneBlade Pro')
  })

  it('preserves case and internal punctuation', () => {
    expect(normalizeEntityName('WAT28371GB (Serie 6)')).toBe('WAT28371GB (Serie 6)')
  })

  it('returns an empty string for empty or whitespace-only input', () => {
    expect(normalizeEntityName('')).toBe('')
    expect(normalizeEntityName('   \t\n ')).toBe('')
  })
})
