import { beforeEach, describe, expect, it, vi } from 'vitest'
import { completeEmailSignUp } from './account'

const { getUser, from, update, firstFilter, lastFilter } = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  firstFilter: vi.fn(),
  lastFilter: vi.fn(),
}))

vi.mock('next-intl/server', () => ({
  getLocale: async () => 'en',
  getTranslations: async () => (key: string) => key,
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser }, from }),
}))

const id = '12345678-1111-4111-8111-111111111111'
const pending = { id, email_confirmed_at: '2026-11-18', user_metadata: { signup_username_pending: true } }

describe('complete email signup', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getUser.mockResolvedValue({ data: { user: pending }, error: null })
    from.mockReturnValue({ update })
    update.mockReturnValue({ eq: firstFilter })
    firstFilter.mockReturnValue({ eq: lastFilter })
    lastFilter.mockResolvedValue({ error: null })
  })

  it('only targets the verified user during the generated-username stage', async () => {
    await expect(completeEmailSignUp('chosen-name')).resolves.toEqual({ ok: true, data: null })
    expect(from).toHaveBeenCalledWith('user_profiles')
    expect(update).toHaveBeenCalledWith({ username: 'chosen-name' })
    expect(firstFilter).toHaveBeenCalledWith('id', id)
    expect(lastFilter).toHaveBeenCalledWith('username', 'user_12345678')
  })

  it('leaves existing accounts alone and refuses an unverified address', async () => {
    getUser.mockResolvedValueOnce({ data: { user: { ...pending, user_metadata: {} } }, error: null })
    await expect(completeEmailSignUp('another-name')).resolves.toEqual({ ok: true, data: null })
    getUser.mockResolvedValueOnce({ data: { user: { ...pending, email_confirmed_at: null } }, error: null })
    await expect(completeEmailSignUp('another-name')).resolves.toEqual({ ok: false, error: 'signInRequired' })
    expect(update).not.toHaveBeenCalled()
  })

  it('reports a username taken during email verification', async () => {
    lastFilter.mockResolvedValue({ error: { code: '23505' } })
    await expect(completeEmailSignUp('chosen-name')).resolves.toEqual({ ok: false, error: 'usernameTaken' })
  })
})
