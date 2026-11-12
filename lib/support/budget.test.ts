import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSupportBudget } from './budget'
import { getUsdToEurRate } from './exchange-rate'

vi.mock('server-only', () => ({}))
vi.mock('./exchange-rate', () => ({ getUsdToEurRate: vi.fn(async () => 0.9) }))

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

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
