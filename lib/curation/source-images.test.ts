import { afterEach, describe, expect, it, vi } from 'vitest'
import { THINGIVERSE_USER_AGENT } from './thingiverse-api'
import {
  downloadSourceImage,
  enabledImageImportPlatforms,
  numberedImageFilename,
  resolveSourceGallery,
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
    expect(resolveSourceGallery('https://www.thingiverse.com/thing:3161')).toBeNull()
    vi.stubEnv('THINGIVERSE_APP_TOKEN', 'token')
    expect(resolveSourceGallery('https://www.thingiverse.com/thing:3161')).not.toBeNull()
    expect(resolveSourceGallery('https://thingiverse.com/thing:3161/files')).not.toBeNull()
  })

  it('checks the host before reading the path as an id', () => {
    vi.stubEnv('THINGIVERSE_APP_TOKEN', 'token')
    expect(resolveSourceGallery('https://example.com/thing:3161')).toBeNull()
    expect(resolveSourceGallery('https://example.com/model/3161')).toBeNull()
    expect(resolveSourceGallery('https://www.printables.com/model/3161-benchy')).not.toBeNull()
    expect(resolveSourceGallery('https://www.thingiverse.com/adafruit')).toBeNull()
    expect(resolveSourceGallery('not a url')).toBeNull()
  })

  it('identifies the platform to the Thingiverse CDN, never with credentials', () => {
    vi.stubEnv('THINGIVERSE_APP_TOKEN', 'token')
    expect(resolveSourceGallery('https://www.thingiverse.com/thing:3161')?.downloadHeaders).toEqual({
      'User-Agent': THINGIVERSE_USER_AGENT,
    })
    expect(resolveSourceGallery('https://www.printables.com/model/3161-benchy')?.downloadHeaders).toEqual({})
  })
})

describe('downloadSourceImage', () => {
  const IMAGE_URL = 'https://cdn.thingiverse.com/assets/ad/ef/80/b5/a5/front.jpg'

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubFetch(response: Response | Error) {
    const fetchMock = vi.fn(async () => {
      if (response instanceof Error) throw response
      return response
    })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('returns the bytes of an image and sends the gallery headers without following redirects', async () => {
    const fetchMock = stubFetch(new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } }))
    const result = await downloadSourceImage(IMAGE_URL, { 'User-Agent': 'Test/1.0' })
    expect(result.ok && result.bytes.byteLength).toBe(3)
    expect(fetchMock).toHaveBeenCalledWith(
      IMAGE_URL,
      expect.objectContaining({ headers: { 'User-Agent': 'Test/1.0' }, redirect: 'manual' }),
    )
  })

  it('reports a Cloudflare challenge with its status', async () => {
    stubFetch(new Response('<html></html>', { status: 403, headers: { 'cf-mitigated': 'challenge', 'content-type': 'text/html' } }))
    expect(await downloadSourceImage(IMAGE_URL, {})).toEqual({ ok: false, reason: 'HTTP 403 (Cloudflare challenge)' })
  })

  it('refuses a redirect instead of following it', async () => {
    stubFetch(new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/latest' } }))
    expect(await downloadSourceImage(IMAGE_URL, {})).toEqual({ ok: false, reason: 'redirect refused (HTTP 302)' })
  })

  it('refuses a response that is not an image', async () => {
    stubFetch(new Response('<html></html>', { headers: { 'content-type': 'text/html; charset=UTF-8' } }))
    expect(await downloadSourceImage(IMAGE_URL, {})).toEqual({ ok: false, reason: 'not an image (text/html)' })
    stubFetch(new Response(new Uint8Array([1])))
    expect(await downloadSourceImage(IMAGE_URL, {})).toEqual({ ok: false, reason: 'not an image (no content type)' })
  })

  it('refuses an empty or oversized image', async () => {
    stubFetch(new Response(new Uint8Array(0), { headers: { 'content-type': 'image/png' } }))
    expect(await downloadSourceImage(IMAGE_URL, {})).toEqual({ ok: false, reason: 'empty body' })
    stubFetch(new Response(new Uint8Array(1), { headers: { 'content-type': 'image/png', 'content-length': String(9 * 1024 * 1024) } }))
    expect(await downloadSourceImage(IMAGE_URL, {})).toEqual({ ok: false, reason: 'too large' })
  })

  it('reports a timeout or a network failure without throwing', async () => {
    stubFetch(new DOMException('The operation timed out.', 'TimeoutError'))
    expect(await downloadSourceImage(IMAGE_URL, {})).toEqual({ ok: false, reason: 'timeout' })
    stubFetch(new TypeError('fetch failed'))
    expect(await downloadSourceImage(IMAGE_URL, {})).toEqual({ ok: false, reason: 'network error' })
  })
})
