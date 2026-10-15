import { beforeEach, describe, expect, it, vi } from 'vitest'

interface QueryResult {
  data: { id: string } | null
  error: Error | null
}

const calls: Array<[string, ...unknown[]]> = []
let result: QueryResult = { data: null, error: null }

/** Records every builder call so the test can assert the update and its scope. */
function fakeQuery() {
  const builder = {
    update: (patch: unknown) => (calls.push(['update', patch]), builder),
    eq: (column: string, value: unknown) => (calls.push(['eq', column, value]), builder),
    select: (columns: string) => (calls.push(['select', columns]), builder),
    maybeSingle: async () => result,
  }
  return builder
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => (calls.push(['from', table]), fakeQuery()),
  }),
}))

const { publishDraftPart } = await import('./publish')

describe('publishDraftPart', () => {
  beforeEach(() => {
    calls.length = 0
    result = { data: null, error: null }
  })

  it('writes the status only, scoped to the part, its owner and draft status', async () => {
    result = { data: { id: 'part-1' }, error: null }

    await expect(publishDraftPart('part-1', 'user-1')).resolves.toBe(true)
    expect(calls).toEqual([
      ['from', 'parts'],
      ['update', { status: 'published' }],
      ['eq', 'id', 'part-1'],
      ['eq', 'user_id', 'user-1'],
      ['eq', 'status', 'draft'],
      ['select', 'id'],
    ])
  })

  it('returns false when no draft of this owner matched', async () => {
    await expect(publishDraftPart('part-1', 'user-1')).resolves.toBe(false)
  })

  it('throws the database error', async () => {
    const error = new Error('update failed')
    result = { data: null, error }

    await expect(publishDraftPart('part-1', 'user-1')).rejects.toBe(error)
  })
})
