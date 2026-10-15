import { describe, expect, it } from 'vitest'
import {
  isSafeRedirect,
  normalizedHostname,
  normalizeEntityName,
  parsePageParam,
  parseRedirectParam,
} from './validation'

describe('normalizeEntityName', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizeEntityName('  OneBlade Pro 360  ')).toBe('OneBlade Pro 360')
  })

  it('collapses internal whitespace runs to single spaces', () => {
    expect(normalizeEntityName('OneBlade   Pro  360')).toBe('OneBlade Pro 360')
  })

  it('normalizes tabs and newlines like spaces', () => {
    expect(normalizeEntityName('OneBlade\tPro\n360')).toBe('OneBlade Pro 360')
    expect(normalizeEntityName(' \t OneBlade \n Pro \t ')).toBe('OneBlade Pro')
  })

  it('preserves case and internal punctuation', () => {
    expect(normalizeEntityName('WAT28371GB (Serie 6)')).toBe('WAT28371GB (Serie 6)')
  })

  it('returns an empty string for empty or whitespace-only input', () => {
    expect(normalizeEntityName('')).toBe('')
    expect(normalizeEntityName('   \t\n ')).toBe('')
  })
})

describe('normalizedHostname', () => {
  it('strips a leading www prefix', () => {
    expect(normalizedHostname('https://www.printables.com/model/3161')).toBe('printables.com')
  })

  it('keeps hostnames without a www prefix unchanged', () => {
    expect(normalizedHostname('https://cults3d.com/en/model/x')).toBe('cults3d.com')
  })

  it('strips www only as a whole leading label', () => {
    expect(normalizedHostname('https://wwwexample.com')).toBe('wwwexample.com')
    expect(normalizedHostname('https://api.printables.com')).toBe('api.printables.com')
  })

  it('lowercases the hostname and ignores port, path and query', () => {
    expect(normalizedHostname('https://WWW.Printables.COM:8443/model/1?x=1')).toBe('printables.com')
  })

  it('returns null for unparseable input', () => {
    expect(normalizedHostname('')).toBeNull()
    expect(normalizedHostname('not a url')).toBeNull()
    expect(normalizedHostname('printables.com/model/3161')).toBeNull()
  })
})

describe('parsePageParam', () => {
  it('reads a positive integer', () => {
    expect(parsePageParam('1')).toBe(1)
    expect(parsePageParam('3')).toBe(3)
  })

  it('falls back to page 1 when the param is missing or empty', () => {
    expect(parsePageParam(undefined)).toBe(1)
    expect(parsePageParam('')).toBe(1)
  })

  it('falls back to page 1 for zero and negative values', () => {
    expect(parsePageParam('0')).toBe(1)
    expect(parsePageParam('-2')).toBe(1)
  })

  it('falls back to page 1 for malformed values', () => {
    expect(parsePageParam('2abc')).toBe(1)
    expect(parsePageParam('1.5')).toBe(1)
    expect(parsePageParam(' 2')).toBe(1)
    expect(parsePageParam('1e3')).toBe(1)
  })

  it('falls back to page 1 beyond the safe integer range', () => {
    expect(parsePageParam('99999999999999999999')).toBe(1)
  })
})

describe('isSafeRedirect', () => {
  it('accepts in-app paths with query strings and fragments', () => {
    expect(isSafeRedirect('/')).toBe(true)
    expect(isSafeRedirect('/publish')).toBe(true)
    expect(isSafeRedirect('/parts/hinge-clip?tab=files#download')).toBe(true)
  })

  it('rejects absolute and protocol-relative URLs', () => {
    expect(isSafeRedirect('https://evil.com')).toBe(false)
    expect(isSafeRedirect('//evil.com')).toBe(false)
    expect(isSafeRedirect('javascript:alert(1)')).toBe(false)
    expect(isSafeRedirect('publish')).toBe(false)
  })

  it('rejects backslashes, whitespace and control characters', () => {
    expect(isSafeRedirect('/\\evil.com')).toBe(false)
    expect(isSafeRedirect('/ /evil.com')).toBe(false)
    expect(isSafeRedirect('/publish\n')).toBe(false)
    expect(isSafeRedirect('/\tevil.com')).toBe(false)
  })

  it('rejects percent-encoded bypass attempts', () => {
    expect(isSafeRedirect('/%2Fevil.com')).toBe(false)
    expect(isSafeRedirect('/%5c%5cevil.com')).toBe(false)
    expect(isSafeRedirect('/%0d%0aLocation:%20https://evil.com')).toBe(false)
  })

  it('rejects malformed percent-encoding', () => {
    expect(isSafeRedirect('/%E0%A4%A')).toBe(false)
  })
})

describe('parseRedirectParam', () => {
  it('returns a safe in-app path unchanged', () => {
    expect(parseRedirectParam('/publish')).toBe('/publish')
    expect(parseRedirectParam('/dashboard')).toBe('/dashboard')
  })

  it('returns null for a missing or empty param', () => {
    expect(parseRedirectParam(null)).toBeNull()
    expect(parseRedirectParam('')).toBeNull()
  })

  it('returns null for an open-redirect attempt', () => {
    expect(parseRedirectParam('https://evil.com')).toBeNull()
    expect(parseRedirectParam('//evil.com')).toBeNull()
    expect(parseRedirectParam('/%5c%5cevil.com')).toBeNull()
  })
})
