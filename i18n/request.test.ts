import { describe, expect, it, vi } from 'vitest'

import en from '@/messages/en.json'
import fr from '@/messages/fr.json'

import requestConfig from './request'

// next-intl/server only exposes getRequestConfig under the react-server
// condition, which Vitest does not use; outside it, the factory is the identity.
vi.mock('next-intl/server', () => ({ getRequestConfig: <T>(create: T): T => create }))

/** Every leaf key of a message tree, as dotted paths. */
function keyPaths(tree: object, prefix = ''): string[] {
  return Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'object' ? keyPaths(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  )
}

describe('request locale (read by getLocale and useLocale)', () => {
  it('is the locale of the URL prefix, with its messages', async () => {
    const config = await requestConfig({ requestLocale: Promise.resolve('en') })
    expect(config.locale).toBe('en')
    expect(config.messages).toEqual(en)
  })

  it('falls back to French for an unknown or missing locale', async () => {
    for (const requested of ['de', undefined]) {
      const config = await requestConfig({ requestLocale: Promise.resolve(requested) })
      expect(config.locale).toBe('fr')
      expect(config.messages).toEqual(fr)
    }
  })
})

describe('message files', () => {
  it('give French every key of the English source, and no other', () => {
    expect(keyPaths(fr).sort()).toEqual(keyPaths(en).sort())
  })
})
