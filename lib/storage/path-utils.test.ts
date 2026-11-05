import { describe, expect, it } from 'vitest'
import { extractBucketStoragePath, partFileBucket } from './path-utils'

const BUCKET = 'model-thumbnails'

describe('extractBucketStoragePath', () => {
  it('extracts the path from a public object URL', () => {
    expect(
      extractBucketStoragePath(
        `https://project.supabase.co/storage/v1/object/public/${BUCKET}/u/p/thumbnails/00-a.png`,
        BUCKET,
      ),
    ).toBe('u/p/thumbnails/00-a.png')
  })

  it('strips the query string of a signed URL', () => {
    expect(
      extractBucketStoragePath(
        `https://project.supabase.co/storage/v1/object/public/${BUCKET}/u/a.png?token=abc`,
        BUCKET,
      ),
    ).toBe('u/a.png')
  })

  it('extracts the path from a relative bucket/path reference', () => {
    expect(extractBucketStoragePath(`${BUCKET}/u/p/thumbnails/00-a.png`, BUCKET)).toBe(
      'u/p/thumbnails/00-a.png',
    )
  })

  it('returns null for a reference into another bucket', () => {
    expect(extractBucketStoragePath('model-files/u/p/files/a.stl', BUCKET)).toBeNull()
    expect(
      extractBucketStoragePath('https://project.supabase.co/storage/v1/object/public/model-files/a.stl', BUCKET),
    ).toBeNull()
  })

  it('returns null for an empty reference or an empty path', () => {
    expect(extractBucketStoragePath(null, BUCKET)).toBeNull()
    expect(extractBucketStoragePath('', BUCKET)).toBeNull()
    expect(extractBucketStoragePath(`${BUCKET}/`, BUCKET)).toBeNull()
  })
})

describe('partFileBucket', () => {
  it('maps each written file category to its bucket', () => {
    expect(partFileBucket('model')).toBe('model-files')
    expect(partFileBucket('image')).toBe('model-thumbnails')
  })

  it('returns null for an unknown or missing category', () => {
    expect(partFileBucket('documentation')).toBeNull()
    expect(partFileBucket('constructor')).toBeNull()
    expect(partFileBucket(null)).toBeNull()
  })
})
