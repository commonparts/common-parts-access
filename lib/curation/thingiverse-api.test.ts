import { afterEach, describe, expect, it, vi } from 'vitest'
import { getThingiverse, isThingiverseConfigured, THINGIVERSE_USER_AGENT } from './thingiverse-api'

describe('getThingiverse', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('sends no request when the app token is not set', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    for (const token of [undefined, '', '   ']) {
      vi.stubEnv('THINGIVERSE_APP_TOKEN', token)
      expect(isThingiverseConfigured()).toBe(false)
      expect(await getThingiverse('/things/3161')).toBeNull()
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('authenticates with the app token and the fixed user agent', async () => {
    vi.stubEnv('THINGIVERSE_APP_TOKEN', 'app-token')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 3161 }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    expect(isThingiverseConfigured()).toBe(true)
    expect(await getThingiverse('/things/3161')).toEqual({ id: 3161 })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.thingiverse.com/things/3161')
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer app-token',
      'User-Agent': THINGIVERSE_USER_AGENT,
    })
  })

  it('returns null on an HTTP error, a malformed body or a network failure', async () => {
    vi.stubEnv('THINGIVERSE_APP_TOKEN', 'app-token')
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":"Thing 1 does not exist"}', { status: 404 })))
    expect(await getThingiverse('/things/1')).toBeNull()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 200 })))
    expect(await getThingiverse('/things/1')).toBeNull()

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))
    expect(await getThingiverse('/things/1')).toBeNull()

    expect(errorLog).toHaveBeenCalledTimes(3)
    errorLog.mockRestore()
  })

  it('logs the status and a Cloudflare challenge, never the token', async () => {
    vi.stubEnv('THINGIVERSE_APP_TOKEN', 'app-token')
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<html>', { status: 403, headers: { 'cf-mitigated': 'challenge' } })),
    )
    expect(await getThingiverse('/things/3161')).toBeNull()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":"Unauthorized"}', { status: 401 })))
    expect(await getThingiverse('/things/3161')).toBeNull()

    const messages = errorLog.mock.calls.map((call) => call.join(' '))
    expect(messages).toEqual([
      'Thingiverse API: GET /things/3161 answered 403 (Cloudflare challenge)',
      'Thingiverse API: GET /things/3161 answered 401',
    ])
    expect(messages.join(' ')).not.toContain('app-token')
    errorLog.mockRestore()
  })
})
