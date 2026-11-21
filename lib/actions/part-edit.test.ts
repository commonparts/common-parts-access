import { beforeEach, expect, it, vi } from 'vitest'
import { editPublishedPart } from './part-edit'

const { getUser, save } = vi.hoisted(() => ({ getUser: vi.fn(), save: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: () => ({ auth: { getUser } }) }))
vi.mock('@/lib/supabase/queries/part-edit', () => ({ savePublishedPartEdit: save }))

const input = { id: '10000000-0000-4000-8000-000000000001', revision: '', removedImages: [], files: [] }

beforeEach(() => {
  vi.resetAllMocks()
  getUser.mockResolvedValue({ data: { user: { id: 'owner' } } })
})

it('rejects invalid input before querying Auth', async () => {
  expect(await editPublishedPart({ ...input, title: 'x' })).toMatchObject({ ok: false, discardUploads: true })
  expect(getUser).not.toHaveBeenCalled()
  expect(save).not.toHaveBeenCalled()
})

it.each([null, { code: '22023' }])('allows cleanup when the RPC confirms rejection (%j)', async (error) => {
  save.mockResolvedValue({ saved: false, error })
  expect(await editPublishedPart(input)).toMatchObject({ ok: false, discardUploads: true })
})
