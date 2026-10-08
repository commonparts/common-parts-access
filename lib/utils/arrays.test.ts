import { describe, expect, it } from 'vitest'

import { chunk } from './arrays'

describe('chunk', () => {
  it('splits into chunks of at most the given size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it('returns no chunks for an empty list', () => {
    expect(chunk([], 3)).toEqual([])
  })

  it('rejects a size below 1', () => {
    expect(() => chunk([1], 0)).toThrow()
  })
})
