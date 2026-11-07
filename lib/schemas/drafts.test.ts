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

  it('trims the title and keeps the ids', async () => {
    expect(await validate(createUploadDraftSchema, valid)).toEqual({
      ok: true,
      data: { title: 'Door hinge', attested: true, categoryId: CATEGORY_ID, licenseId: LICENSE_ID },
    })
  })

  it('refuses a field the upload flow does not expose, naming it first', async () => {
    const result = await validate(createUploadDraftSchema, { ...valid, title: 'x', sourceUrl: 'https://example.com' })
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toContain('"sourceUrl" cannot be set through the upload flow')
  })

  it('requires an explicit originality declaration', async () => {
    expect(await validate(createUploadDraftSchema, { ...valid, attested: 'yes' })).toEqual({
      ok: false,
      error: 'Originality declaration: Must be confirmed to start an upload',
    })
  })

  it('refuses a body that is not an object', async () => {
    expect(await validate(createUploadDraftSchema, [])).toEqual({
      ok: false,
      error: 'Invalid input: expected record, received array',
    })
  })
})

describe('updateUploadDraftSchema', () => {
  it('refuses a body with no known field', async () => {
    expect(await validate(updateUploadDraftSchema, {})).toEqual({ ok: false, error: 'Nothing to update' })
    expect(await validate(updateUploadDraftSchema, { unknown: 1 })).toEqual({ ok: false, error: 'Nothing to update' })
  })

  it('clears a text or metadata column with an empty string', async () => {
    const result = await validate(updateUploadDraftSchema, {
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

  it('parses the metadata JSON strings and numeric strings', async () => {
    const result = await validate(updateUploadDraftSchema, {
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

  it('names the invalid metadata', async () => {
    expect(await validate(updateUploadDraftSchema, { dimensions: '{' })).toEqual({ ok: false, error: 'Dimensions: Not valid JSON' })
    expect(await validate(updateUploadDraftSchema, { dimensions: '{"unit":"ft"}' })).toEqual({
      ok: false,
      error: 'Dimensions › Unit: Invalid option: expected one of "mm"|"cm"|"in"',
    })
    expect(await validate(updateUploadDraftSchema, { print_settings: '{"infill":120}' })).toEqual({
      ok: false,
      error: 'Print settings › Infill: Too big: expected number to be <=100',
    })
    expect(await validate(updateUploadDraftSchema, { estimated_print_time: '1.5' })).toEqual({
      ok: false,
      error: 'Print time: Invalid input: expected int, received number',
    })
    expect(await validate(updateUploadDraftSchema, { estimated_material_usage: '-1' })).toEqual({
      ok: false,
      error: 'Material usage: Too small: expected number to be >=0',
    })
    // A non-string is refused, never coerced into a cleared column.
    expect(await validate(updateUploadDraftSchema, { material: 42 })).toEqual({
      ok: false,
      error: 'Material: Invalid input: expected string, received number',
    })
  })

  it('drops blank tags before checking the limits', async () => {
    expect(await validate(updateUploadDraftSchema, { tags: [' hinge ', '', 'door'] })).toEqual({
      ok: true,
      data: { tags: ['hinge', 'door'] },
    })
    expect(await validate(updateUploadDraftSchema, { tags: ['a'] })).toEqual({
      ok: false,
      error: 'Tags: Too small: expected string to have >=2 characters',
    })
  })

  it('refuses repeated or malformed product ids as a whole', async () => {
    expect(await validate(updateUploadDraftSchema, { productIds: [PRODUCT_ID, PRODUCT_ID] })).toEqual({
      ok: false,
      error: 'Compatible products: Each item can be listed only once',
    })
    expect(await validate(updateUploadDraftSchema, { productIds: [PRODUCT_ID, 'nope'] })).toEqual({
      ok: false,
      error: 'Compatible products: Invalid identifier',
    })
    expect(await validate(updateUploadDraftSchema, { productIds: [] })).toEqual({ ok: true, data: { productIds: [] } })
  })
})

describe('updateCurationDraftSchema', () => {
  it('clears the category with an empty string', async () => {
    expect(await validate(updateCurationDraftSchema, { categoryId: '' })).toEqual({ ok: true, data: { categoryId: null } })
    expect(await validate(updateCurationDraftSchema, { categoryId: 'nope' })).toEqual({
      ok: false,
      error: 'Category: Invalid identifier',
    })
  })

  it('leaves the hosting type out when the key is absent', async () => {
    expect(await validate(updateCurationDraftSchema, { title: 'Door hinge' })).toEqual({
      ok: true,
      data: { title: 'Door hinge' },
    })
  })

  it('reads a null or empty hosting type as link_out and refuses hosted', async () => {
    expect(await validate(updateCurationDraftSchema, { fileHostingType: null })).toEqual({
      ok: true,
      data: { fileHostingType: 'link_out' },
    })
    const hosted = await validate(updateCurationDraftSchema, { fileHostingType: 'hosted' })
    expect(hosted.ok).toBe(false)
  })

  it('keeps the known checklist criteria and refuses non-booleans', async () => {
    expect(await validate(updateCurationDraftSchema, { checklist: { license: true, other: true } })).toEqual({
      ok: true,
      data: { checklist: { license: true } },
    })
    expect(await validate(updateCurationDraftSchema, { checklist: { license: 'yes' } })).toEqual({
      ok: false,
      error: 'Checklist › license: Invalid input: expected boolean, received string',
    })
  })

  it('names a flag that is not a boolean', async () => {
    expect(await validate(updateCurationDraftSchema, { needs_photo: 'true' })).toEqual({
      ok: false,
      error: 'needs_photo: Invalid input: expected boolean, received string',
    })
  })
})

describe('toPartDraftColumns', () => {
  it('maps the sent fields to their columns and nothing else', async () => {
    expect(toPartDraftColumns({ title: 'Door hinge', description: null })).toEqual({
      name: 'Door hinge',
      description: null,
    })
    expect(toPartDraftColumns({})).toEqual({})
  })
})
