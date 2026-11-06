import { describe, expect, it } from 'vitest'
import {
  extractBucketStoragePath,
  isOwnStorageReference,
  partFileBucket,
  toStorageReference,
} from './path-utils'

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

describe('toStorageReference', () => {
  it('joins the bucket and the path', () => {
    expect(toStorageReference(BUCKET, 'u/p/thumbnails/00-a.png')).toBe(`${BUCKET}/u/p/thumbnails/00-a.png`)
  })

  it('drops leading slashes of the path', () => {
    expect(toStorageReference(BUCKET, '//u/a.png')).toBe(`${BUCKET}/u/a.png`)
  })
})

describe('isOwnStorageReference', () => {
  const PRODUCT_BUCKET = 'product-thumbnails'
  const USER = '3aee820f-727c-460f-b13a-c6c06ad2d2b1'

  it('accepts an object in the user folder of the bucket', () => {
    expect(isOwnStorageReference(`${PRODUCT_BUCKET}/${USER}/product-1730800000000-v8.webp`, PRODUCT_BUCKET, USER)).toBe(true)
  })

  it('refuses a full URL', () => {
    expect(
      isOwnStorageReference(
        `https://project.supabase.co/storage/v1/object/public/${PRODUCT_BUCKET}/${USER}/a.png`,
        PRODUCT_BUCKET,
        USER,
      ),
    ).toBe(false)
  })

  it('refuses another user folder or another bucket', () => {
    expect(isOwnStorageReference(`${PRODUCT_BUCKET}/other-user/a.png`, PRODUCT_BUCKET, USER)).toBe(false)
    expect(isOwnStorageReference(`model-thumbnails/${USER}/a.png`, PRODUCT_BUCKET, USER)).toBe(false)
  })

  it('refuses nested paths, dot segments and unsafe characters', () => {
    expect(isOwnStorageReference(`${PRODUCT_BUCKET}/${USER}/../other/a.png`, PRODUCT_BUCKET, USER)).toBe(false)
    expect(isOwnStorageReference(`${PRODUCT_BUCKET}/${USER}/..`, PRODUCT_BUCKET, USER)).toBe(false)
    expect(isOwnStorageReference(`${PRODUCT_BUCKET}/${USER}/`, PRODUCT_BUCKET, USER)).toBe(false)
    expect(isOwnStorageReference(`${PRODUCT_BUCKET}/${USER}/a b.png`, PRODUCT_BUCKET, USER)).toBe(false)
  })

  it('refuses an over-long reference', () => {
    expect(isOwnStorageReference(`${PRODUCT_BUCKET}/${USER}/${'a'.repeat(500)}.png`, PRODUCT_BUCKET, USER)).toBe(false)
  })
})
