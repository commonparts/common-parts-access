import { describe, expect, it } from 'vitest'
import { numberedImageFilename } from './source-images'

describe('numberedImageFilename', () => {
  it('prefixes the source filename with a zero-padded index', () => {
    expect(
      numberedImageFilename(0, 'https://media.printables.com/media/prints/611501/images/a-b/clip-on.png'),
    ).toBe('00-clip-on.png')
    expect(
      numberedImageFilename(1, 'https://media.printables.com/media/prints/611501/images/a-b/clip-off.jpg'),
    ).toBe('01-clip-off.jpg')
    expect(numberedImageFilename(10, 'https://e.com/photo.webp')).toBe('10-photo.webp')
  })

  it('sanitizes unsafe characters in the source name', () => {
    expect(numberedImageFilename(2, 'https://e.com/my%20photo(1).png')).toBe('02-my20photo1.png')
  })

  it('returns null for non-image or extension-less sources', () => {
    expect(numberedImageFilename(0, 'https://e.com/file.gcode')).toBeNull()
    expect(numberedImageFilename(0, 'https://e.com/noextension')).toBeNull()
    expect(numberedImageFilename(0, 'not a url')).toBeNull()
  })
})
