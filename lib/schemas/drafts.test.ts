import { describe, expect, it } from 'vitest'
import { validate } from '@/lib/api/parse'
import { updateCurationDraftSchema } from './curation'
import { toPartDraftColumns } from './drafts'
import { createUploadDraftSchema, updateUploadDraftSchema } from './upload'

const CATEGORY_ID = '11111111-1111-4111-8111-111111111111'
const LICENSE_ID = '22222222-2222-4222-8222-222222222222'
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333'

describe('createUploadDraftSchema', () => {
  const valid = { title: '  Door hinge ', attested: true, categoryId: CATEGORY_ID, licenseId: LICENSE_ID }

  it('trims the title and keeps the ids', () => {
    expect(validate(createUploadDraftSchema, valid)).toEqual({
      ok: true,
      data: { title: 'Door hinge', attested: true, categoryId: CATEGORY_ID, licenseId: LICENSE_ID },
    })
  })

  it('refuses a field the upload flow does not expose, naming it first', () => {
    const result = validate(createUploadDraftSchema, { ...valid, title: 'x', sourceUrl: 'https://example.com' })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toContain('"sourceUrl" cannot be set through the upload flow')
  })

  it('requires an explicit originality declaration', () => {
    expect(validate(createUploadDraftSchema, { ...valid, attested: 'yes' })).toEqual({
      ok: false,
      error: 'The originality declaration must be confirmed to start an upload',
    })
  })

  it('refuses a body that is not an object', () => {
    expect(validate(createUploadDraftSchema, [])).toEqual({ ok: false, error: 'Invalid request body' })
  })
})

describe('updateUploadDraftSchema', () => {
  it('refuses a body with no known field', () => {
    expect(validate(updateUploadDraftSchema, {})).toEqual({ ok: false, error: 'Nothing to update' })
    expect(validate(updateUploadDraftSchema, { unknown: 1 })).toEqual({ ok: false, error: 'Nothing to update' })
  })

  it('clears a text or metadata column with an empty string', () => {
    const result = validate(updateUploadDraftSchema, {
      description: '  ',
      material: '',
      dimensions: '',
      estimated_print_time: ' ',
    })
    expect(result).toEqual({
      ok: true,
      data: { description: null, material: null, dimensions: null, estimated_print_time: null },
    })
  })

  it('parses the metadata JSON strings and numeric strings', () => {
    const result = validate(updateUploadDraftSchema, {
      dimensions: JSON.stringify({ length: 12.5, unit: 'mm', extra: true }),
      print_settings: JSON.stringify({ infill: 20, supports: 'none' }),
      estimated_print_time: '90',
      estimated_material_usage: '12.5',
    })
    expect(result).toEqual({
      ok: true,
      data: {
        dimensions: { length: 12.5, unit: 'mm' },
        print_settings: { infill: 20, supports: 'none' },
        estimated_print_time: 90,
        estimated_material_usage: 12.5,
      },
    })
  })

  it('names the invalid metadata', () => {
    expect(validate(updateUploadDraftSchema, { dimensions: '{' })).toEqual({ ok: false, error: 'Invalid JSON in dimensions' })
    expect(validate(updateUploadDraftSchema, { dimensions: '{"unit":"ft"}' })).toEqual({
      ok: false,
      error: 'dimensions.unit must be one of: mm, cm, in',
    })
    expect(validate(updateUploadDraftSchema, { dimensions: 'null' })).toEqual({
      ok: false,
      error: 'dimensions must be a JSON object',
    })
    expect(validate(updateUploadDraftSchema, { print_settings: '{"infill":120}' })).toEqual({
      ok: false,
      error: 'print_settings.infill must be a finite number between 0 and 100',
    })
    expect(validate(updateUploadDraftSchema, { estimated_print_time: '1.5' })).toEqual({
      ok: false,
      error: 'estimated_print_time must be a valid integer',
    })
    expect(validate(updateUploadDraftSchema, { estimated_material_usage: '-1' })).toEqual({
      ok: false,
      error: 'estimated_material_usage must be a non-negative number',
    })
    // A non-string is refused, never coerced into a cleared column.
    expect(validate(updateUploadDraftSchema, { material: 42 })).toEqual({ ok: false, error: 'Material must be a string' })
  })

  it('drops blank tags before checking the limits', () => {
    expect(validate(updateUploadDraftSchema, { tags: [' hinge ', '', 'door'] })).toEqual({
      ok: true,
      data: { tags: ['hinge', 'door'] },
    })
    expect(validate(updateUploadDraftSchema, { tags: ['a'] })).toEqual({
      ok: false,
      error: 'Tags must be between 2 and 20 characters',
    })
  })

  it('refuses repeated or malformed product ids as a whole', () => {
    const message = { ok: false, error: 'productIds must be unique product UUIDs' }
    expect(validate(updateUploadDraftSchema, { productIds: [PRODUCT_ID, PRODUCT_ID] })).toEqual(message)
    expect(validate(updateUploadDraftSchema, { productIds: [PRODUCT_ID, 'nope'] })).toEqual(message)
    expect(validate(updateUploadDraftSchema, { productIds: [] })).toEqual({ ok: true, data: { productIds: [] } })
  })
})

describe('updateCurationDraftSchema', () => {
  it('clears the category with an empty string', () => {
    expect(validate(updateCurationDraftSchema, { categoryId: '' })).toEqual({ ok: true, data: { categoryId: null } })
    expect(validate(updateCurationDraftSchema, { categoryId: 'nope' })).toEqual({ ok: false, error: 'Invalid category' })
  })

  it('leaves the hosting type out when the key is absent', () => {
    expect(validate(updateCurationDraftSchema, { title: 'Door hinge' })).toEqual({
      ok: true,
      data: { title: 'Door hinge' },
    })
  })

  it('reads a null or empty hosting type as link_out and refuses hosted', () => {
    expect(validate(updateCurationDraftSchema, { fileHostingType: null })).toEqual({
      ok: true,
      data: { fileHostingType: 'link_out' },
    })
    const hosted = validate(updateCurationDraftSchema, { fileHostingType: 'hosted' })
    expect(hosted.ok).toBe(false)
  })

  it('keeps the known checklist criteria and refuses non-booleans', () => {
    expect(validate(updateCurationDraftSchema, { checklist: { license: true, other: true } })).toEqual({
      ok: true,
      data: { checklist: { license: true } },
    })
    expect(validate(updateCurationDraftSchema, { checklist: { license: 'yes' } })).toEqual({
      ok: false,
      error: 'Checklist must be an object of criterion booleans',
    })
  })

  it('names a flag that is not a boolean', () => {
    expect(validate(updateCurationDraftSchema, { needs_photo: 'true' })).toEqual({
      ok: false,
      error: 'needs_photo must be a boolean',
    })
  })
})

describe('toPartDraftColumns', () => {
  it('maps the sent fields to their columns and nothing else', () => {
    expect(toPartDraftColumns({ title: 'Door hinge', description: null })).toEqual({
      name: 'Door hinge',
      description: null,
    })
    expect(toPartDraftColumns({})).toEqual({})
  })
})
