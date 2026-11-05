import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveStorageUrl, resolveStorageUrls, withResolvedPartMedia } from './url'

const SUPABASE_URL = 'https://project.supabase.test'
const PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public`

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', `${SUPABASE_URL}/`)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('resolveStorageUrl', () => {
  it('builds the public URL of a relative storage reference', () => {
    expect(resolveStorageUrl('model-thumbnails/u/p/thumbnails/00-a.png')).toBe(
      `${PUBLIC_PREFIX}/model-thumbnails/u/p/thumbnails/00-a.png`,
    )
  })

  it('returns a full URL unchanged', () => {
    const url = 'https://other.example/storage/v1/object/public/model-thumbnails/a.png'
    expect(resolveStorageUrl(url)).toBe(url)
  })

  it('returns null for a missing reference', () => {
    expect(resolveStorageUrl(null)).toBeNull()
    expect(resolveStorageUrl(undefined)).toBeNull()
  })
})

describe('resolveStorageUrls', () => {
  it('resolves every string entry and drops the others', () => {
    expect(
      resolveStorageUrls(['model-thumbnails/a.png', 42, null, 'https://e.com/b.png']),
    ).toEqual([`${PUBLIC_PREFIX}/model-thumbnails/a.png`, 'https://e.com/b.png'])
  })

  it('returns an empty list for a value that is not an array', () => {
    expect(resolveStorageUrls(null)).toEqual([])
    expect(resolveStorageUrls('model-thumbnails/a.png')).toEqual([])
  })
})

describe('withResolvedPartMedia', () => {
  it('resolves the thumbnail and the gallery without changing the stored row', () => {
    const row = {
      id: 'part-1',
      thumbnail_url: 'model-thumbnails/a.png',
      images: ['model-thumbnails/a.png', 'model-thumbnails/b.png'],
    }

    expect(withResolvedPartMedia(row)).toEqual({
      id: 'part-1',
      thumbnail_url: `${PUBLIC_PREFIX}/model-thumbnails/a.png`,
      images: [`${PUBLIC_PREFIX}/model-thumbnails/a.png`, `${PUBLIC_PREFIX}/model-thumbnails/b.png`],
    })
    expect(row.thumbnail_url).toBe('model-thumbnails/a.png')
    expect(row.images).toEqual(['model-thumbnails/a.png', 'model-thumbnails/b.png'])
  })

  it('leaves absent and null media fields as they are', () => {
    const withoutMedia: { id: string; thumbnail_url?: string | null } = { id: 'part-1' }
    expect(withResolvedPartMedia(withoutMedia)).toEqual({ id: 'part-1' })
    expect(withResolvedPartMedia({ id: 'part-1', thumbnail_url: null, images: null })).toEqual({
      id: 'part-1',
      thumbnail_url: null,
      images: null,
    })
  })
})
