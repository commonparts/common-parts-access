import { afterEach, describe, expect, it, vi } from 'vitest'
import { getUsdToEurRate } from './exchange-rate'

vi.mock('server-only', () => ({}))
afterEach(() => vi.unstubAllGlobals())

describe('Frankfurter conversion', () => {
  it('reads the USD to EUR rate with a shared daily cache', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ base: 'USD', rates: { EUR: 0.86 } }))
    vi.stubGlobal('fetch', fetcher)
    expect(await getUsdToEurRate()).toBe(0.86)
    expect(fetcher).toHaveBeenCalledWith('https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR', expect.objectContaining({ next: { revalidate: 86400 } }))
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
