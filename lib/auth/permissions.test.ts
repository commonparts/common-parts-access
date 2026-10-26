import { afterEach, describe, expect, it, vi } from 'vitest'
import { isCurator, parseCuratorIds } from './permissions'

const CURATOR_ID = '6f1c2d3e-4a5b-4c6d-8e7f-901234567890'
const OTHER_ID = '0a1b2c3d-4e5f-4a6b-9c7d-8e9f01234567'

describe('parseCuratorIds', () => {
  it('returns an empty set when the variable is unset or blank', () => {
    expect(parseCuratorIds(undefined).size).toBe(0)
    expect(parseCuratorIds('').size).toBe(0)
    expect(parseCuratorIds(' , ').size).toBe(0)
  })

  it('trims, lowercases and keeps every valid id', () => {
    const ids = parseCuratorIds(` ${CURATOR_ID.toUpperCase()} ,${OTHER_ID}`)
    expect([...ids]).toEqual([CURATOR_ID, OTHER_ID])
  })

  it('drops entries that are not UUIDs', () => {
    expect([...parseCuratorIds(`admin,${CURATOR_ID},*`)]).toEqual([CURATOR_ID])
  })
})

describe('isCurator', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('grants listed users only', () => {
    vi.stubEnv('CURATOR_USER_IDS', CURATOR_ID)
    expect(isCurator(CURATOR_ID)).toBe(true)
    expect(isCurator(CURATOR_ID.toUpperCase())).toBe(true)
    expect(isCurator(OTHER_ID)).toBe(false)
  })

  it('denies everyone when the variable is unset', () => {
    vi.stubEnv('CURATOR_USER_IDS', undefined)
    expect(isCurator(CURATOR_ID)).toBe(false)
  })

  it('denies a missing user', () => {
    vi.stubEnv('CURATOR_USER_IDS', CURATOR_ID)
    expect(isCurator(null)).toBe(false)
    expect(isCurator(undefined)).toBe(false)
  })
})
