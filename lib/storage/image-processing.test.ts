import { describe, expect, it } from 'vitest'
import { inferImageContentType } from './image-processing'

describe('inferImageContentType', () => {
  it('maps every accepted image extension to its MIME type, case-insensitively', () => {
    expect(inferImageContentType('.jpg')).toBe('image/jpeg')
    expect(inferImageContentType('.jpeg')).toBe('image/jpeg')
    expect(inferImageContentType('.png')).toBe('image/png')
    expect(inferImageContentType('.webp')).toBe('image/webp')
    expect(inferImageContentType('.gif')).toBe('image/gif')
    expect(inferImageContentType('.GIF')).toBe('image/gif')
  })

  it('returns undefined for an unknown extension', () => {
    expect(inferImageContentType('.bmp')).toBeUndefined()
  })
})
