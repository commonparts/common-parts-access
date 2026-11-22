import { PHASE_PRODUCTION_BUILD } from 'next/constants'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { register } from './instrumentation'

const { removeExpiredPartEditUploads } = vi.hoisted(() => ({ removeExpiredPartEditUploads: vi.fn() }))
vi.mock('@/lib/supabase/queries/part-edit', () => ({ removeExpiredPartEditUploads }))

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.test')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'test-key')
  vi.stubEnv('NEXT_RUNTIME', 'nodejs')
  vi.stubEnv('NEXT_PHASE', '')
  vi.stubEnv('RAILWAY_ENVIRONMENT_NAME', 'production')
  removeExpiredPartEditUploads.mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

it.each([
  ['RAILWAY_ENVIRONMENT_NAME', 'staging'],
  ['NEXT_PHASE', PHASE_PRODUCTION_BUILD],
  ['NEXT_RUNTIME', 'edge'],
])('skips storage cleanup when %s is %s', async (name, value) => {
  vi.stubEnv(name, value)
  await register()
  expect(removeExpiredPartEditUploads).not.toHaveBeenCalled()
})

it('runs cleanup at startup and repeats it hourly in Railway production', async () => {
  await register()
  expect(removeExpiredPartEditUploads).toHaveBeenCalledTimes(1)

  await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
  expect(removeExpiredPartEditUploads).toHaveBeenCalledTimes(2)
})
