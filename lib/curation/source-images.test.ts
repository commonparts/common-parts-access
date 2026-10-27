import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  enabledImageImportPlatforms,
  numberedImageFilename,
  sourceGalleryLister,
  thingiverseImageUrls,
} from './source-images'

describe('numberedImageFilename', () => {
  it('prefixes the source filename with a zero-padded index', () => {
    expect(
      numberedImageFilename(0, 'https://media.printables.com/media/prints/611501/images/a-b/clip-on.png'),
    ).toBe('00-clip-on.png')
    expect(
      numberedImageFilename(1, 'https://media.printables.com/media/prints/611501/images/a-b/clip-off.jpg'),
    ).toBe('01-clip-off.jpg')
    expect(numberedImageFilename(10, 'https://e.com/photo.webp')).toBe('10-photo.webp')
    expect(numberedImageFilename(3, 'https://e.com/clip-anim.GIF')).toBe('03-clip-anim.gif')
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

/** One image of a live GET /things/{id}/images response, trimmed. */
function thingiverseImage(rank: number, file: string) {
  return {
    id: 1000 + rank,
    name: file,
    rank,
    sizes: [
      { type: 'thumb', size: 'large', url: `https://cdn.thingiverse.com/assets/ad/ef/80/b5/a5/${file}` },
      { type: 'thumb', size: 'medium', url: `https://cdn.thingiverse.com/assets/ad/ef/80/b5/a5/${file}` },
      {
        type: 'display',
        size: 'large',
        url: `https://resize.thingiverse.com/?url=https://cdn.thingiverse.com/assets/ad/ef/80/b5/a5/${file}&w=1024&h=1024`,
      },
    ],
  }
}

describe('thingiverseImageUrls', () => {
  it('returns the original-upload URLs in gallery order', () => {
    expect(
      thingiverseImageUrls([thingiverseImage(1, 'side.png'), thingiverseImage(0, 'front.JPG'), thingiverseImage(2, 'top.jpg')]),
    ).toEqual([
      'https://cdn.thingiverse.com/assets/ad/ef/80/b5/a5/front.JPG',
      'https://cdn.thingiverse.com/assets/ad/ef/80/b5/a5/side.png',
      'https://cdn.thingiverse.com/assets/ad/ef/80/b5/a5/top.jpg',
    ])
  })

  it('drops images with no original size or served from another host', () => {
    expect(
      thingiverseImageUrls([
        { rank: 0, sizes: [{ type: 'display', size: 'large', url: 'https://resize.thingiverse.com/?url=x' }] },
        { rank: 1, sizes: [{ type: 'thumb', size: 'large', url: 'https://evil.example/a.png' }] },
        { rank: 2, sizes: [{ type: 'thumb', size: 'large', url: 'http://cdn.thingiverse.com/a.png' }] },
        { rank: 3, sizes: null },
        null,
      ]),
    ).toEqual([])
  })

  it('returns an empty list for a malformed body', () => {
    expect(thingiverseImageUrls(null)).toEqual([])
    expect(thingiverseImageUrls({ error: 'Thing 1 does not exist' })).toEqual([])
  })
})

describe('image import configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('enables Thingiverse only when the app token is set', () => {
    vi.stubEnv('THINGIVERSE_APP_TOKEN', '')
    expect(enabledImageImportPlatforms()).toEqual(['printables'])
    vi.stubEnv('THINGIVERSE_APP_TOKEN', 'token')
    expect(enabledImageImportPlatforms()).toEqual(['printables', 'thingiverse'])
  })

  it('reads a Thingiverse source only when the app token is set', () => {
    vi.stubEnv('THINGIVERSE_APP_TOKEN', '')
    expect(sourceGalleryLister('https://www.thingiverse.com/thing:3161')).toBeNull()
    vi.stubEnv('THINGIVERSE_APP_TOKEN', 'token')
    expect(sourceGalleryLister('https://www.thingiverse.com/thing:3161')).toBeTypeOf('function')
    expect(sourceGalleryLister('https://thingiverse.com/thing:3161/files')).toBeTypeOf('function')
  })

  it('checks the host before reading the path as an id', () => {
    vi.stubEnv('THINGIVERSE_APP_TOKEN', 'token')
    expect(sourceGalleryLister('https://example.com/thing:3161')).toBeNull()
    expect(sourceGalleryLister('https://example.com/model/3161')).toBeNull()
    expect(sourceGalleryLister('https://www.printables.com/model/3161-benchy')).toBeTypeOf('function')
    expect(sourceGalleryLister('https://www.thingiverse.com/adafruit')).toBeNull()
    expect(sourceGalleryLister('not a url')).toBeNull()
  })
})
