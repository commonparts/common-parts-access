import { describe, expect, it, vi } from 'vitest'
import {
  RANGE_NOT_SATISFIABLE,
  countPages,
  fetchPageOrFirst,
  isPastLastPage,
  pageRange,
} from './pagination'

const rows = (count: number) => ({ data: Array.from({ length: count }, (_, i) => i), error: null })
const rangeError = { data: null, error: { code: RANGE_NOT_SATISFIABLE } }
const otherError = { data: null, error: { code: '42P01' } }

describe('pageRange', () => {
  it('returns the inclusive row bounds of a page', () => {
    expect(pageRange(1, 20)).toEqual({ from: 0, to: 19 })
    expect(pageRange(3, 24)).toEqual({ from: 48, to: 71 })
  })

  it('reads a page below 1 as page 1', () => {
    expect(pageRange(0, 20)).toEqual({ from: 0, to: 19 })
    expect(pageRange(-4, 20)).toEqual({ from: 0, to: 19 })
  })
})

describe('countPages', () => {
  it('rounds partial pages up', () => {
    expect(countPages(14, 5)).toBe(3)
    expect(countPages(20, 20)).toBe(1)
    expect(countPages(21, 20)).toBe(2)
  })

  it('reports one page for an empty listing', () => {
    expect(countPages(0, 20)).toBe(1)
  })
})

describe('isPastLastPage', () => {
  it('detects a range PostgREST refused', () => {
    expect(isPastLastPage(5, rangeError)).toBe(true)
  })

  it('detects an empty page past page 1', () => {
    expect(isPastLastPage(2, rows(0))).toBe(true)
  })

  it('accepts a page that returned rows', () => {
    expect(isPastLastPage(3, rows(4))).toBe(false)
  })

  it('never flags page 1, even empty', () => {
    expect(isPastLastPage(1, rows(0))).toBe(false)
    expect(isPastLastPage(1, rangeError)).toBe(false)
  })

  it('leaves any other error to the caller', () => {
    expect(isPastLastPage(4, otherError)).toBe(false)
  })
})

describe('fetchPageOrFirst', () => {
  it('runs the query once for a page within range', async () => {
    const run = vi.fn(async () => rows(5))
    const { page, result } = await fetchPageOrFirst(2, run)
    expect(page).toBe(2)
    expect(result.data).toHaveLength(5)
    expect(run).toHaveBeenCalledTimes(1)
    expect(run).toHaveBeenCalledWith(2)
  })

  it('falls back to page 1 when the range is refused', async () => {
    const run = vi.fn(async (target: number) => (target === 1 ? rows(5) : rangeError))
    const { page, result } = await fetchPageOrFirst(99, run)
    expect(page).toBe(1)
    expect(result.data).toHaveLength(5)
    expect(run.mock.calls).toEqual([[99], [1]])
  })

  it('falls back to page 1 when the page comes back empty', async () => {
    const run = vi.fn(async (target: number) => (target === 1 ? rows(5) : rows(0)))
    const { page } = await fetchPageOrFirst(2, run)
    expect(page).toBe(1)
    expect(run.mock.calls).toEqual([[2], [1]])
  })

  it('reads a page below 1 as page 1 without a second query', async () => {
    const run = vi.fn(async () => rows(0))
    const { page } = await fetchPageOrFirst(0, run)
    expect(page).toBe(1)
    expect(run.mock.calls).toEqual([[1]])
  })

  it('returns any other error untouched for the caller to throw', async () => {
    const run = vi.fn(async () => otherError)
    const { page, result } = await fetchPageOrFirst(3, run)
    expect(page).toBe(3)
    expect(result.error).toEqual({ code: '42P01' })
    expect(run).toHaveBeenCalledTimes(1)
  })
})
