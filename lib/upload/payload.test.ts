import { describe, expect, it } from 'vitest'
import { FORBIDDEN_UPLOAD_FIELDS, findForbiddenField, forbiddenFieldError } from './payload'

describe('findForbiddenField', () => {
  it('accepts a payload using only what the public flow may set', () => {
    expect(
      findForbiddenField({
        title: 'Dishwasher rack wheel clip',
        categoryId: 'a3f1c2d4-0000-4000-8000-000000000001',
        licenseId: 'a3f1c2d4-0000-4000-8000-000000000002',
        attested: true,
        description: 'Replaces the broken clip',
        tags: ['dishwasher'],
        productIds: [],
      }),
    ).toBeNull()
  })

  it('rejects every field the flow does not expose', () => {
    for (const field of FORBIDDEN_UPLOAD_FIELDS) {
      expect(findForbiddenField({ title: 'Part', [field]: 'anything' })).toBe(field)
    }
  })

  it('rejects both camelCase and snake_case spellings', () => {
    expect(findForbiddenField({ fileHostingType: 'link_out' })).toBe('fileHostingType')
    expect(findForbiddenField({ file_hosting_type: 'link_out' })).toBe('file_hosting_type')
    expect(findForbiddenField({ originType: 'curated' })).toBe('originType')
    expect(findForbiddenField({ origin_type: 'curated' })).toBe('origin_type')
  })

  // Presence is the signal, not the value: a caller sending the value this
  // flow would have used anyway is still driving a control it does not expose.
  it('rejects a forbidden field even when it carries the value the flow forces', () => {
    expect(findForbiddenField({ fileHostingType: 'hosted' })).toBe('fileHostingType')
    expect(findForbiddenField({ originType: 'original' })).toBe('originType')
    expect(findForbiddenField({ verificationStatus: 'unverified' })).toBe('verificationStatus')
  })

  // A self-granted badge is the reason verification_status is not settable here.
  it('rejects a self-declared verification status', () => {
    expect(findForbiddenField({ verification_status: 'certified' })).toBe('verification_status')
  })

  it('rejects a field explicitly set to null or undefined', () => {
    expect(findForbiddenField({ sourceUrl: null })).toBe('sourceUrl')
    expect(findForbiddenField({ sourceUrl: undefined })).toBe('sourceUrl')
  })

  // Fails closed: the check is `in`, so a forbidden key reachable through the
  // prototype chain is rejected too. JSON.parse cannot produce one, but a
  // guard that errs toward refusing costs nothing here.
  it('rejects a forbidden key reached through the prototype chain', () => {
    const payload = Object.create({ sourceUrl: 'https://www.printables.com/model/1' }) as Record<string, unknown>
    payload.title = 'Part'
    expect(findForbiddenField(payload)).toBe('sourceUrl')
  })

  it('names the offending field in the error message', () => {
    expect(forbiddenFieldError('sourceUrl')).toContain('"sourceUrl"')
    expect(forbiddenFieldError('sourceUrl')).toContain('curation')
  })
})
