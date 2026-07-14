import { describe, expect, it } from 'vitest'
import { formatPrintTime, pluralize } from './formatters'

describe('formatPrintTime', () => {
  it('formats whole hours, minutes, and mixed durations', () => {
    expect(formatPrintTime(45)).toBe('45m')
    expect(formatPrintTime(60)).toBe('1h')
    expect(formatPrintTime(150)).toBe('2h 30m')
  })

  it('rounds fractional minutes without rolling up to "1h 60m"', () => {
    expect(formatPrintTime(119.6)).toBe('2h')
    expect(formatPrintTime(59.4)).toBe('59m')
  })

  it('returns null for missing or non-positive values', () => {
    expect(formatPrintTime(null)).toBeNull()
    expect(formatPrintTime(undefined)).toBeNull()
    expect(formatPrintTime(0)).toBeNull()
    expect(formatPrintTime(-5)).toBeNull()
  })

  it('returns null instead of "0m" for values that round to zero', () => {
    expect(formatPrintTime(0.4)).toBeNull()
  })

  it('returns null for non-finite values', () => {
    expect(formatPrintTime(Number.NaN)).toBeNull()
    expect(formatPrintTime(Number.POSITIVE_INFINITY)).toBeNull()
  })
})

describe('pluralize', () => {
  it('keeps the singular noun for a count of 1', () => {
    expect(pluralize(1, 'part')).toBe('1 part')
  })

  it('pluralizes for other counts, including zero', () => {
    expect(pluralize(0, 'part')).toBe('0 parts')
    expect(pluralize(2, 'brand')).toBe('2 brands')
  })
})
