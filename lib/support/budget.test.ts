import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSupportBudget } from './budget'
import { getUsdToEurRate } from './exchange-rate'

const { cachedResults } = vi.hoisted(() => ({ cachedResults: new Map<string, unknown>() }))

vi.mock('server-only', () => ({}))
vi.mock('next/cache', () => ({
  unstable_cache: (read: () => Promise<unknown>, keyParts: string[]) => async (): Promise<unknown> => {
    const key = JSON.stringify(keyParts)
    if (!cachedResults.has(key)) cachedResults.set(key, await read())
    return cachedResults.get(key)
  },
}))
vi.mock('./exchange-rate', () => ({ getUsdToEurRate: vi.fn(async () => 0.9) }))

afterEach(() => {
  cachedResults.clear()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function configure(): void {
  vi.stubEnv('RAILWAY_API_TOKEN', 'secret-test-token')
  vi.stubEnv('RAILWAY_PROJECT_ID', 'test-project')
  vi.stubEnv('SUPPORT_SUPABASE_MONTHLY_EUR', '25')
}

describe('support budget', () => {
  it('converts the API forecast and total without exposing credentials', async () => {
    configure()
    const fetcher = vi.fn().mockResolvedValue(Response.json({ data: { estimatedUsage: [
      { measurement: 'CPU_USAGE', estimatedValue: 43200 },
      { measurement: 'MEMORY_USAGE_GB', estimatedValue: 43200 },
      { measurement: 'NETWORK_TX_GB', estimatedValue: 10 },
      { measurement: 'DISK_USAGE_GB', estimatedValue: 43200 },
      { measurement: 'BACKUP_USAGE_GB', estimatedValue: 43200 },
    ] } }))
    vi.stubGlobal('fetch', fetcher)
    const budget = await getSupportBudget()
    expect(budget.railway).toBeCloseTo(27.72)
    expect(budget.total).toBeCloseTo(52.72)
    expect(JSON.stringify(budget)).not.toContain('secret-test-token')
    expect(fetcher.mock.calls[0][1].body).toContain('test-project')
  })

  it.each([
    { errors: [{ message: 'denied' }], data: { estimatedUsage: [] } },
    { data: { estimatedUsage: [] } },
    { data: { estimatedUsage: [{ measurement: 'CPU_USAGE', estimatedValue: -1 }] } },
    { data: null },
  ])('keeps unavailable forecasts out of the total: %j', async (body) => {
    configure()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body)))
    expect(await getSupportBudget()).toMatchObject({ railway: null, total: 25, supabase: 25 })
  })

  it('retries an HTTP 200 GraphQL error and caches the successful forecast', async () => {
    configure()
    const data = { estimatedUsage: [{ measurement: 'CPU_USAGE', estimatedValue: 43200 }] }
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ data, errors: [{ message: 'Temporary error' }] }))
      .mockResolvedValueOnce(Response.json({ data }))
    vi.stubGlobal('fetch', fetcher)

    expect(await getSupportBudget()).toMatchObject({ railway: null, total: 25 })
    expect(await getSupportBudget()).toMatchObject({ railway: 18, total: 43 })
    expect(await getSupportBudget()).toMatchObject({ railway: 18, total: 43 })
    expect(fetcher).toHaveBeenCalledTimes(2)
    for (const [, options] of fetcher.mock.calls) {
      expect(options).toMatchObject({ cache: 'no-store' })
      expect(options).not.toHaveProperty('next.revalidate')
    }
  })

  it('keeps the euro forecast unavailable when conversion fails', async () => {
    configure()
    vi.mocked(getUsdToEurRate).mockResolvedValueOnce(null)
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    expect(await getSupportBudget()).toMatchObject({ railway: null, total: 25, supabase: 25 })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('handles network failure without losing manual costs', async () => {
    configure()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))
    expect(await getSupportBudget()).toMatchObject({ railway: null, total: 25 })
  })

  it('totals Railway when Supabase is unavailable', async () => {
    configure()
    vi.stubEnv('SUPPORT_SUPABASE_MONTHLY_EUR', '')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: { estimatedUsage: [
      { measurement: 'CPU_USAGE', estimatedValue: 43200 },
    ] } })))
    expect(await getSupportBudget()).toMatchObject({ railway: 18, supabase: null, total: 18 })
  })

  it('totals zero when both costs are unavailable', async () => {
    configure()
    vi.stubEnv('RAILWAY_API_TOKEN', '')
    vi.stubEnv('SUPPORT_SUPABASE_MONTHLY_EUR', '')
    expect(await getSupportBudget()).toMatchObject({ railway: null, supabase: null, total: 0 })
  })

  it('does not request Railway without credentials and distinguishes blank from zero', async () => {
    configure()
    vi.stubEnv('RAILWAY_API_TOKEN', '')
    vi.stubEnv('SUPPORT_SUPABASE_MONTHLY_EUR', '0')
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    expect(await getSupportBudget()).toMatchObject({ railway: null, supabase: 0, total: 0 })
    expect(fetcher).not.toHaveBeenCalled()
  })
})
