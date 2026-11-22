import { PHASE_PRODUCTION_BUILD } from 'next/constants'

const UPLOAD_CLEANUP_INTERVAL_MS = 60 * 60 * 1000

/**
 * Runs once when a Next.js server instance starts, before it handles any
 * request. Validates the server environment, so a deployment with a missing
 * or malformed variable fails at boot with the list of variables to fix,
 * instead of on the first request that reads one of them.
 */
export async function register(): Promise<void> {
  const { serverEnv, validateServerEnv } = await import('@/lib/env')
  validateServerEnv()

  if (process.env.NEXT_RUNTIME !== 'nodejs' || serverEnv('NEXT_PHASE') === PHASE_PRODUCTION_BUILD ||
    serverEnv('RAILWAY_ENVIRONMENT_NAME') !== 'production') return

  const { removeExpiredPartEditUploads } = await import('@/lib/supabase/queries/part-edit')
  async function cleanUpUploads(): Promise<void> {
    try {
      await removeExpiredPartEditUploads()
    } catch (error) {
      console.error('Failed to clean up expired part edit uploads', error)
    } finally {
      setTimeout(() => void cleanUpUploads(), UPLOAD_CLEANUP_INTERVAL_MS).unref()
    }
  }

  void cleanUpUploads()
}
