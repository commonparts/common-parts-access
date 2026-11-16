import 'server-only'
import { unstable_cache } from 'next/cache'
import { z } from 'zod'

const CACHE_SECONDS = 24 * 60 * 60
const TIMEOUT_MS = 5000
const rateSchema = z.object({ base: z.literal('USD'), rates: z.object({ EUR: z.number().finite().positive() }) })

const getCachedRate = unstable_cache(async (): Promise<number> => {
  const response = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR', {
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`Frankfurter rate request failed with HTTP ${response.status}`)
  const parsed = rateSchema.safeParse(await response.json())
  if (!parsed.success) throw new Error('Invalid Frankfurter rate response')
  return parsed.data.rates.EUR
}, ['frankfurter-usd-eur-rate'], { revalidate: CACHE_SECONDS })

/** Shared daily reference rate. A cold cache can retry after a failed request. */
export async function getUsdToEurRate(): Promise<number | null> {
  try {
    return await getCachedRate()
  } catch {
    return null
  }
}
