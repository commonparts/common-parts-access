import { describe, expect, it } from 'vitest'
import { shouldImportOnResume, supportsImageImport } from './image-import'

// The two server configurations: Thingiverse import off (no token) and on.
const WITHOUT_THINGIVERSE = ['printables']
const WITH_THINGIVERSE = ['printables', 'thingiverse']

describe('supportsImageImport', () => {
  it('accepts Printables in both configurations', () => {
    expect(supportsImageImport('printables', WITHOUT_THINGIVERSE)).toBe(true)
    expect(supportsImageImport('printables', WITH_THINGIVERSE)).toBe(true)
  })

  it('accepts Thingiverse only when the server enables it', () => {
    expect(supportsImageImport('thingiverse', WITHOUT_THINGIVERSE)).toBe(false)
    expect(supportsImageImport('thingiverse', WITH_THINGIVERSE)).toBe(true)
  })

  it('rejects other or missing platforms', () => {
    expect(supportsImageImport('github', WITH_THINGIVERSE)).toBe(false)
    expect(supportsImageImport('', WITH_THINGIVERSE)).toBe(false)
    expect(supportsImageImport(null, WITH_THINGIVERSE)).toBe(false)
    expect(supportsImageImport(undefined, WITH_THINGIVERSE)).toBe(false)
  })
})

describe('shouldImportOnResume', () => {
  it('imports for a Printables draft with no image', () => {
    expect(
      shouldImportOnResume({ sourcePlatform: 'printables', imageFileCount: 0, imageCount: 0 }, WITHOUT_THINGIVERSE),
    ).toBe(true)
  })

  it('skips a draft that already has an image', () => {
    expect(
      shouldImportOnResume({ sourcePlatform: 'printables', imageFileCount: 1, imageCount: 1 }, WITH_THINGIVERSE),
    ).toBe(false)
    expect(
      shouldImportOnResume({ sourcePlatform: 'printables', imageFileCount: 2, imageCount: 0 }, WITH_THINGIVERSE),
    ).toBe(false)
    expect(
      shouldImportOnResume({ sourcePlatform: 'printables', imageFileCount: 0, imageCount: 1 }, WITH_THINGIVERSE),
    ).toBe(false)
  })

  it('imports for a Thingiverse draft only when the server enables it', () => {
    const draft = { sourcePlatform: 'thingiverse', imageFileCount: 0, imageCount: 0 }
    expect(shouldImportOnResume(draft, WITHOUT_THINGIVERSE)).toBe(false)
    expect(shouldImportOnResume(draft, WITH_THINGIVERSE)).toBe(true)
  })

  it('skips a missing platform', () => {
    expect(shouldImportOnResume({ sourcePlatform: null, imageFileCount: 0, imageCount: 0 }, WITH_THINGIVERSE)).toBe(
      false,
    )
  })
})
