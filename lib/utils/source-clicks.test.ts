import { afterEach, describe, expect, it, vi } from 'vitest'
import { isSourceClickContext, sendSourceClick, sourceClickEndpoint } from './source-clicks'

describe('isSourceClickContext', () => {
  it('accepts the two recorded contexts', () => {
    expect(isSourceClickContext('part_page')).toBe(true)
    expect(isSourceClickContext('card')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isSourceClickContext('home')).toBe(false)
    expect(isSourceClickContext('')).toBe(false)
    expect(isSourceClickContext(null)).toBe(false)
    expect(isSourceClickContext(1)).toBe(false)
  })
})

describe('sourceClickEndpoint', () => {
  it('targets the source-click route of the part', () => {
    expect(sourceClickEndpoint('blade-guard')).toBe('/api/parts/blade-guard/source-click')
  })
})

describe('sendSourceClick', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('queues a JSON beacon carrying the context', async () => {
    const sendBeacon = vi.fn().mockReturnValue(true)
    const fetchMock = vi.fn()
    vi.stubGlobal('navigator', { sendBeacon })
    vi.stubGlobal('fetch', fetchMock)

    sendSourceClick('blade-guard', 'card')

    expect(sendBeacon).toHaveBeenCalledOnce()
    const [url, blob] = sendBeacon.mock.calls[0] as [string, Blob]
    expect(url).toBe('/api/parts/blade-guard/source-click')
    expect(blob.type).toBe('application/json')
    expect(JSON.parse(await blob.text())).toEqual({ context: 'card' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('falls back to a keepalive fetch when the beacon is refused', () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null))
    vi.stubGlobal('navigator', { sendBeacon: vi.fn().mockReturnValue(false) })
    vi.stubGlobal('fetch', fetchMock)

    sendSourceClick('blade-guard', 'part_page')

    expect(fetchMock).toHaveBeenCalledWith('/api/parts/blade-guard/source-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context: 'part_page' }),
      keepalive: true,
    })
  })

  it('falls back to fetch when the beacon API is missing, and never throws on failure', async () => {
    const error = new Error('offline')
    const fetchMock = vi.fn().mockRejectedValue(error)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('fetch', fetchMock)

    expect(() => sendSourceClick('blade-guard', 'card')).not.toThrow()
    await vi.waitFor(() => expect(consoleError).toHaveBeenCalledWith('Source click tracking failed:', error))

    expect(fetchMock).toHaveBeenCalledOnce()
    consoleError.mockRestore()
  })
})
