import { describe, expect, it } from 'vitest'
import { shouldImportOnResume, supportsImageImport } from './image-import'

describe('supportsImageImport', () => {
  it('accepts Printables only', () => {
    expect(supportsImageImport('printables')).toBe(true)
    expect(supportsImageImport('thingiverse')).toBe(false)
    expect(supportsImageImport('')).toBe(false)
    expect(supportsImageImport(null)).toBe(false)
    expect(supportsImageImport(undefined)).toBe(false)
  })
})

describe('shouldImportOnResume', () => {
  it('imports for a Printables draft with no image', () => {
    expect(shouldImportOnResume({ sourcePlatform: 'printables', imageFileCount: 0, imageCount: 0 })).toBe(true)
  })

  it('skips a draft that already has an image', () => {
    expect(shouldImportOnResume({ sourcePlatform: 'printables', imageFileCount: 1, imageCount: 1 })).toBe(false)
    expect(shouldImportOnResume({ sourcePlatform: 'printables', imageFileCount: 2, imageCount: 0 })).toBe(false)
    expect(shouldImportOnResume({ sourcePlatform: 'printables', imageFileCount: 0, imageCount: 1 })).toBe(false)
  })

  it('skips an unsupported or missing platform', () => {
    expect(shouldImportOnResume({ sourcePlatform: 'thingiverse', imageFileCount: 0, imageCount: 0 })).toBe(false)
    expect(shouldImportOnResume({ sourcePlatform: null, imageFileCount: 0, imageCount: 0 })).toBe(false)
  })
})
