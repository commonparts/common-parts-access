import { describe, expect, it } from 'vitest'
import { mergeImageUrls, sortImageUrls } from './images'

describe('sortImageUrls', () => {
  it('sorts by filename with numeric awareness', () => {
    expect(
      sortImageUrls(['https://e.com/a/10-x.png', 'https://e.com/b/00-y.png', 'https://e.com/c/02-z.png']),
    ).toEqual(['https://e.com/b/00-y.png', 'https://e.com/c/02-z.png', 'https://e.com/a/10-x.png'])
  })
})

describe('mergeImageUrls', () => {
  it('merges thumbnail, gallery and new urls, deduplicated and sorted', () => {
    expect(
      mergeImageUrls('https://e.com/01-b.png', ['https://e.com/01-b.png', 'https://e.com/02-c.png'], [
        'https://e.com/00-a.png',
      ]),
    ).toEqual(['https://e.com/00-a.png', 'https://e.com/01-b.png', 'https://e.com/02-c.png'])
  })

  it('tolerates missing or malformed current values', () => {
    expect(mergeImageUrls(null, undefined, ['https://e.com/00-a.png'])).toEqual(['https://e.com/00-a.png'])
    expect(mergeImageUrls('', [42, 'https://e.com/01-b.png'], [])).toEqual(['https://e.com/01-b.png'])
  })
})
