import { afterEach, describe, expect, it, vi } from 'vitest'
import { getUsdToEurRate } from './exchange-rate'

const { cache } = vi.hoisted(() => ({ cache: new Map<string, number>() }))

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((load: () => Promise<number>, keyParts: string[]) => async (): Promise<number> => {
    const key = JSON.stringify(keyParts)
    const cached = cache.get(key)
    if (cached !== undefined) return cached
    const value = await load()
    cache.set(key, value)
    return value
  }),
}))

afterEach(() => {
  cache.clear()
  vi.unstubAllGlobals()
})

describe('Frankfurter conversion', () => {
  it('reads the USD to EUR rate with a shared daily cache', async () => {
    const { unstable_cache } = await import('next/cache')
    const fetcher = vi.fn().mockResolvedValue(Response.json({ base: 'USD', rates: { EUR: 0.86 } }))
    vi.stubGlobal('fetch', fetcher)
    expect(await getUsdToEurRate()).toBe(0.86)
    expect(await getUsdToEurRate()).toBe(0.86)
    expect(fetcher).toHaveBeenCalledExactlyOnceWith('https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR', expect.objectContaining({ cache: 'no-store' }))
    expect(unstable_cache).toHaveBeenCalledWith(expect.any(Function), ['frankfurter-usd-eur-rate'], { revalidate: 86400 })
  })

  it('retries an invalid HTTP 200 and caches the validated rate', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ base: 'USD', rates: {} }))
      .mockResolvedValueOnce(Response.json({ base: 'USD', rates: { EUR: 0.86 } }))
    vi.stubGlobal('fetch', fetcher)

    expect(await getUsdToEurRate()).toBeNull()
    expect(await getUsdToEurRate()).toBe(0.86)
    expect(await getUsdToEurRate()).toBe(0.86)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it.each([{ base: 'EUR', rates: { EUR: 1 } }, { base: 'USD', rates: { EUR: 0 } }, { base: 'USD', rates: {} }])('rejects invalid rate data: %j', async (body) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body)))
    expect(await getUsdToEurRate()).toBeNull()
  })

  it('handles HTTP and network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))
    expect(await getUsdToEurRate()).toBeNull()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))
    expect(await getUsdToEurRate()).toBeNull()
  })
})
