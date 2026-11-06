import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { config, proxy } from './proxy'

const getUser = vi.fn()
let refreshedCookies: { name: string; value: string; options: object }[] = []

vi.mock('@supabase/ssr', () => ({
  createServerClient: (
    _url: string,
    _key: string,
    { cookies }: { cookies: { setAll: (cookies: typeof refreshedCookies) => void } },
  ) => ({
    auth: {
      getUser: async () => {
        if (refreshedCookies.length) cookies.setAll(refreshedCookies)
        return getUser()
      },
    },
  }),
}))

function request(path: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(new URL(path, 'https://access.test'), { headers })
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test')
  getUser.mockReset().mockResolvedValue({ data: { user: null } })
  refreshedCookies = []
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('locale routing', () => {
  it('redirects an unprefixed URL to the Accept-Language locale, query string kept', async () => {
    const response = await proxy(request('/browse?page=2', { 'accept-language': 'en-GB,en;q=0.9' }))
    expect(response.headers.get('location')).toBe('https://access.test/en/browse?page=2')
  })

  it('falls back to French when Accept-Language names no supported locale', async () => {
    const response = await proxy(request('/', { 'accept-language': 'de-DE' }))
    expect(response.headers.get('location')).toBe('https://access.test/fr')
  })

  it('prefers the locale cookie set by the language switcher over Accept-Language', async () => {
    const response = await proxy(
      request('/browse', { 'accept-language': 'fr-FR', cookie: 'NEXT_LOCALE=en' }),
    )
    expect(response.headers.get('location')).toBe('https://access.test/en/browse')
  })

  it('serves a prefixed URL in its locale', async () => {
    const response = await proxy(request('/en/browse', { 'accept-language': 'fr-FR' }))
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('x-middleware-request-x-next-intl-locale')).toBe('en')
  })
})

describe('protected routes', () => {
  it('redirects a signed-out visitor to the login page of the same locale', async () => {
    const response = await proxy(request('/en/settings/profile?tab=avatar'))
    expect(response.headers.get('location')).toBe(
      'https://access.test/en/login?redirect=%2Fen%2Fsettings%2Fprofile',
    )
  })

  it('lets a signed-in user through', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } })
    const response = await proxy(request('/fr/publish'))
    expect(response.headers.get('location')).toBeNull()
  })

  it('does not protect a page that only shares a prefix', async () => {
    const response = await proxy(request('/fr/publishers'))
    expect(response.headers.get('location')).toBeNull()
  })
})

describe('session refresh', () => {
  it('sends refreshed cookies to the browser and to Server Components', async () => {
    refreshedCookies = [{ name: 'sb-token', value: 'fresh', options: { path: '/' } }]
    const response = await proxy(request('/fr/browse', { cookie: 'sb-token=stale' }))
    expect(response.cookies.get('sb-token')?.value).toBe('fresh')
    expect(response.headers.get('x-middleware-request-cookie')).toContain('sb-token=fresh')
  })

  it('keeps refreshed cookies on the login redirect', async () => {
    refreshedCookies = [{ name: 'sb-token', value: '', options: { maxAge: 0 } }]
    const response = await proxy(request('/fr/dashboard'))
    expect(response.headers.get('location')).toContain('/fr/login')
    expect(response.cookies.get('sb-token')?.value).toBe('')
  })

  it('still routes the locale when the Supabase variables are not set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '')
    const response = await proxy(request('/browse', { 'accept-language': 'en' }))
    expect(response.headers.get('location')).toBe('https://access.test/en/browse')
    expect(getUser).not.toHaveBeenCalled()
  })
})

describe('matcher', () => {
  it.each(['/', '/browse', '/fr/parts/hinge-clip', '/en/login'])('runs on page %s', (url) => {
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true)
  })

  it.each(['/api/parts', '/confirm?token_hash=abc', '/robots.txt', '/_next/static/chunk.js'])(
    'skips %s',
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false)
    },
  )
})
