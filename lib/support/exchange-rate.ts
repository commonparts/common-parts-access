import 'server-only'
import { z } from 'zod'

const CACHE_SECONDS = 24 * 60 * 60
const TIMEOUT_MS = 5000
const rateSchema = z.object({ base: z.literal('USD'), rates: z.object({ EUR: z.number().finite().positive() }) })

/** Daily reference rate shared across visitors through Next.js's server fetch cache. */
export async function getUsdToEurRate(): Promise<number | null> {
  try {
    const response = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR', {
      next: { revalidate: CACHE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!response.ok) return null
    const parsed = rateSchema.safeParse(await response.json())
    return parsed.success ? parsed.data.rates.EUR : null
  } catch {
    return null
  }
}
