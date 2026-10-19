import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const APP_DIR = path.resolve(__dirname)

/** Every loading.tsx under a directory, as paths relative to app/. */
function findLoadingFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((entry) => path.basename(entry) === 'loading.tsx')
    .map((entry) => path.relative(APP_DIR, path.join(dir, entry)))
}

// A loading.tsx is a Suspense boundary: everything below it streams after the
// response headers are sent, so notFound() thrown by a page under it can no
// longer change the status and unknown slugs answer 200 (a soft 404, #275).
describe('loading boundaries above public pages', () => {
  it('has no loading.tsx at the app root', () => {
    expect(existsSync(path.join(APP_DIR, 'loading.tsx'))).toBe(false)
  })

  it('has no loading.tsx in the public route group', () => {
    expect(findLoadingFiles(path.join(APP_DIR, '(public)'))).toEqual([])
  })
})
