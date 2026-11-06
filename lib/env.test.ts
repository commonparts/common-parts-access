import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { serverEnv, validateServerEnv } from './env'
import { findPublicEnv, getPublicEnv } from './public-env'

const SUPABASE_URL = 'https://project.supabase.test'
const PUBLISHABLE_KEY = 'sb_publishable_test'

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', SUPABASE_URL)
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', PUBLISHABLE_KEY)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getPublicEnv', () => {
  it('returns the validated public variables', () => {
    expect(getPublicEnv()).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: PUBLISHABLE_KEY,
    })
  })

  it('names the missing variable without printing any value', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', undefined)
    expect(() => getPublicEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/)
    expect(() => getPublicEnv()).not.toThrow(new RegExp(SUPABASE_URL))
  })

  it('rejects a URL that is not http(s)', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'project.supabase.test')
    expect(() => getPublicEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })
})

describe('findPublicEnv', () => {
  it('returns null when a variable is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', undefined)
    expect(findPublicEnv()).toBeNull()
  })
})

describe('serverEnv', () => {
  it('reads an optional variable as undefined when unset or blank', () => {
    vi.stubEnv('THINGIVERSE_APP_TOKEN', undefined)
    expect(serverEnv('THINGIVERSE_APP_TOKEN')).toBeUndefined()
    vi.stubEnv('THINGIVERSE_APP_TOKEN', '   ')
    expect(serverEnv('THINGIVERSE_APP_TOKEN')).toBeUndefined()
  })

  it('trims a set variable', () => {
    vi.stubEnv('SUPABASE_SECRET_KEY', ' sb_secret_test ')
    expect(serverEnv('SUPABASE_SECRET_KEY')).toBe('sb_secret_test')
  })

  it('checks only the variable it reads', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', undefined)
    vi.stubEnv('CURATOR_USER_IDS', 'id')
    expect(serverEnv('CURATOR_USER_IDS')).toBe('id')
    expect(() => serverEnv('NEXT_PUBLIC_SUPABASE_URL')).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)
  })
})

describe('validateServerEnv', () => {
  it('passes when the required variables are set', () => {
    expect(() => validateServerEnv()).not.toThrow()
  })

  it('lists every invalid variable at once', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', undefined)
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '')
    expect(() => validateServerEnv()).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL.*NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    )
  })
})
