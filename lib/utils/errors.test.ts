import { describe, expect, it } from 'vitest'
import { hasErrorCode, isPartNotFoundError } from './errors'

describe('hasErrorCode', () => {
  it('matches the code of a Supabase error object', () => {
    expect(hasErrorCode({ code: '23505', message: 'duplicate key' }, '23505')).toBe(true)
    expect(hasErrorCode({ code: '23503' }, '23505')).toBe(false)
  })

  it('is false for values without a code', () => {
    expect(hasErrorCode(new Error('boom'), '23505')).toBe(false)
    expect(hasErrorCode(null, '23505')).toBe(false)
    expect(hasErrorCode('23505', '23505')).toBe(false)
  })
})

describe('isPartNotFoundError', () => {
  it('recognizes the error by message or by code', () => {
    expect(isPartNotFoundError(new Error('PART_NOT_FOUND'))).toBe(true)
    expect(isPartNotFoundError({ code: 'PART_NOT_FOUND' })).toBe(true)
    expect(isPartNotFoundError(new Error('other'))).toBe(false)
  })
})
