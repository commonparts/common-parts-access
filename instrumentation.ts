/**
 * Runs once when a Next.js server instance starts, before it handles any
 * request. Validates the server environment, so a deployment with a missing
 * or malformed variable fails at boot with the list of variables to fix,
 * instead of on the first request that reads one of them.
 */
export async function register(): Promise<void> {
  const { validateServerEnv } = await import('@/lib/env')
  validateServerEnv()
}
