import { z } from 'zod'
import { formatEnvError, publicEnvSchema } from '@/lib/public-env'

/**
 * Server environment variables, validated with a schema.
 *
 * Every server variable is read through `serverEnv()`, never through
 * `process.env` directly, so a missing or malformed value surfaces as one
 * message naming the variable instead of an `undefined` deep in a request.
 * `validateServerEnv()` runs the whole schema once when the server starts
 * (instrumentation.ts), so a misconfigured deployment fails at boot.
 *
 * None of these variables has the `NEXT_PUBLIC_` prefix, so Next.js never
 * inlines them into a client bundle; a client component importing this module
 * would only read `undefined`. Public variables are read through
 * `lib/public-env.ts` and are validated here as well.
 */

/** An unset or blank optional variable reads as undefined. */
const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined)

const optionalAmount = optionalString.pipe(z.coerce.number<string>().finite().nonnegative().optional())

const serverEnvSchema = publicEnvSchema.extend({
  /**
   * Secret key acting as the service role. Optional: without it the features
   * that need the service role answer that they are unavailable
   * (`createAdminClient()` throws, the routes map it to a 503).
   */
  SUPABASE_SECRET_KEY: optionalString,
  /** Comma-separated user ids allowed to read curation data; unset means nobody. */
  CURATOR_USER_IDS: optionalString,
  /** Thingiverse app token; unset disables the extractor and the image import. */
  THINGIVERSE_APP_TOKEN: optionalString,
  RAILWAY_API_TOKEN: optionalString,
  RAILWAY_PROJECT_ID: optionalString,
  SUPPORT_USD_TO_EUR: optionalString.pipe(z.coerce.number<string>().finite().positive().optional()),
  SUPPORT_SUPABASE_MONTHLY_EUR: optionalAmount,
  SUPPORT_DOMAIN_ANNUAL_EUR: optionalAmount,
  SUPPORT_LEETCHI_URL: optionalString.pipe(z.url().refine((value) => {
    const url = new URL(value)
    return url.protocol === 'https:' && ['leetchi.com', 'www.leetchi.com'].includes(url.hostname)
  }).optional()),
})

type ServerEnv = z.infer<typeof serverEnvSchema>

/**
 * Returns one validated server variable, or throws an error naming it when it
 * is missing or malformed. Reads the variable on every call rather than
 * caching it: the parse is cheap, and each variable is checked on its own so
 * a feature never fails on a variable it does not use.
 */
export function serverEnv<Name extends keyof ServerEnv>(name: Name): ServerEnv[Name] {
  // Cast: `shape[name]` is the schema whose output is `ServerEnv[name]` by
  // construction, but TypeScript cannot relate an indexed schema to the
  // indexed output of the same key.
  const schema = serverEnvSchema.shape[name] as unknown as z.ZodType<ServerEnv[Name]>
  const result = schema.safeParse(process.env[name])
  if (!result.success) {
    throw new Error(`Invalid environment configuration: set ${name} (${result.error.issues[0]?.message})`)
  }
  return result.data
}

/**
 * Validates every server variable at once, when the server starts
 * (instrumentation.ts), so a misconfigured deployment fails at boot with the
 * full list of variables to fix rather than on the first request that needs
 * one of them.
 */
export function validateServerEnv(): void {
  const result = serverEnvSchema.safeParse(process.env)
  if (!result.success) throw new Error(formatEnvError(result.error))
}
