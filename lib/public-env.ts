import { z } from 'zod'

/**
 * Public environment variables, validated with a schema.
 *
 * Client-safe: Next.js inlines a `NEXT_PUBLIC_` value at build time only where
 * it is read through a literal `process.env.NEXT_PUBLIC_…` expression, so
 * this module reads each variable by name before validating, and never
 * indexes `process.env` dynamically. Server-only variables are read through
 * `lib/env.ts`, which validates these too.
 */

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ protocol: /^https?$/ }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1),
})

type PublicEnv = z.infer<typeof publicEnvSchema>

/** The public variables as the build inlined them. */
function readRawPublicEnv(): Record<keyof PublicEnv, string | undefined> {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }
}

/**
 * Formats the issues of a failed environment parse as one actionable message
 * naming every invalid variable, never its value (a key must not reach logs).
 */
export function formatEnvError(error: z.ZodError): string {
  const variables = error.issues.map((issue) => `${issue.path.join('.')} (${issue.message})`)
  return `Invalid environment configuration: set ${variables.join(', ')}`
}

/**
 * Returns the validated public variables, or throws an error naming the
 * missing or malformed ones. Every Supabase client needs them.
 */
export function getPublicEnv(): PublicEnv {
  const result = publicEnvSchema.safeParse(readRawPublicEnv())
  if (!result.success) throw new Error(formatEnvError(result.error))
  return result.data
}

/**
 * Returns the validated public variables, or null when they are not set. For
 * the session middleware only, which lets requests through unauthenticated
 * rather than failing every page of a deployment that is not configured yet.
 */
export function findPublicEnv(): PublicEnv | null {
  const result = publicEnvSchema.safeParse(readRawPublicEnv())
  return result.success ? result.data : null
}
