import 'server-only'
import { unstable_cache } from 'next/cache'
import { z } from 'zod'
import { serverEnv } from '@/lib/env'
import { getUsdToEurRate } from './exchange-rate'

const MINUTES_PER_MONTH = 43_200
// Railway CLI usage.rs pricing, in USD per resource unit (November 2026).
const PRICES = {
  CPU_USAGE: 20 / MINUTES_PER_MONTH,
  MEMORY_USAGE_GB: 10 / MINUTES_PER_MONTH,
  NETWORK_TX_GB: 0.05,
  DISK_USAGE_GB: 0.15 / MINUTES_PER_MONTH,
  BACKUP_USAGE_GB: 0.15 / MINUTES_PER_MONTH,
} as const
const TIMEOUT_MS = 5000
const CACHE_SECONDS = 3600
const MEASUREMENTS = Object.keys(PRICES)
const forecastSchema = z.object({
  data: z.object({ estimatedUsage: z.array(z.object({
    measurement: z.enum(Object.keys(PRICES) as [keyof typeof PRICES, ...(keyof typeof PRICES)[]]),
    estimatedValue: z.number().finite().nonnegative(),
  })).min(1) }),
  errors: z.array(z.unknown()).optional(),
})
type EstimatedUsage = z.output<typeof forecastSchema>['data']['estimatedUsage']

/** Rejects failed forecasts so Next.js can retry without caching an error. */
async function fetchRailwayUsage(projectId: string, token: string): Promise<EstimatedUsage> {
  const response = await fetch('https://backboard.railway.com/graphql/v2', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: `query SupportForecast($projectId: String!, $measurements: [MetricMeasurement!]!) {
        estimatedUsage(projectId: $projectId, measurements: $measurements) { measurement estimatedValue }
      }`,
      variables: { projectId, measurements: MEASUREMENTS },
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`Railway forecast request failed with HTTP ${response.status}`)
  const parsed = forecastSchema.safeParse(await response.json())
  if (!parsed.success || parsed.data.errors?.length) throw new Error('Invalid Railway forecast response')
  return parsed.data.data.estimatedUsage
}

/** Reads only this project's forecast; failures never become a misleading zero cost. */
async function railwayForecast(): Promise<number | null> {
  const token = serverEnv('RAILWAY_API_TOKEN')
  const projectId = serverEnv('RAILWAY_PROJECT_ID')
  if (!token || !projectId) return null
  const rate = await getUsdToEurRate()
  if (rate === null) return null
  try {
    const usage = await unstable_cache(
      () => fetchRailwayUsage(projectId, token),
      ['railway-estimated-usage', projectId, ...MEASUREMENTS],
      { revalidate: CACHE_SECONDS },
    )()
    return usage.reduce((sum, item) => sum + item.estimatedValue * PRICES[item.measurement], 0) * rate
  } catch {
    return null
  }
}

/** Public budget values only; credentials and project identifiers stay on the server. */
export async function getSupportBudget(): Promise<{
  railway: number | null
  supabase: number | null
  total: number
}> {
  const railway = await railwayForecast()
  const supabase = serverEnv('SUPPORT_SUPABASE_MONTHLY_EUR') ?? null
  return {
    railway, supabase,
    total: (railway ?? 0) + (supabase ?? 0),
  }
}
