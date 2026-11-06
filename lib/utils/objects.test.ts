import { describe, expect, it } from 'vitest'
import { omitKey } from './objects'

describe('omitKey', () => {
  it('drops the key and keeps every other one', () => {
    const row = { id: 'a', user_id: 'u', name: 'Part' }
    expect(omitKey(row, 'user_id')).toEqual({ id: 'a', name: 'Part' })
  })

  it('does not mutate the original object', () => {
    const row = { id: 'a', user_id: 'u' }
    omitKey(row, 'user_id')
    expect(row).toEqual({ id: 'a', user_id: 'u' })
  })
})
