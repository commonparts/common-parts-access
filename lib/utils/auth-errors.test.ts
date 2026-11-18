import { AuthApiError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { authErrorKey } from './auth-errors'

describe('authErrorKey', () => {
  it('names the message of a known Supabase Auth error code', () => {
    expect(authErrorKey(new AuthApiError('Code expired', 403, 'otp_expired'))).toBe('invalidCode')
  })

  it('falls back to the generic message', () => {
    expect(authErrorKey(new AuthApiError('Boom', 500, 'unexpected_failure'))).toBe('generic')
    expect(authErrorKey(new AuthApiError('No code', 500, undefined))).toBe('generic')
    expect(authErrorKey(new Error('Network'))).toBe('generic')
    expect(authErrorKey({ code: 'toString' })).toBe('generic')
  })
})
