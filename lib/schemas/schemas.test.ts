import { describe, expect, it } from 'vitest'
import { validate } from '@/lib/api/parse'
import { MAX_PRINT_REPORT_COMMENT_LENGTH } from '@/lib/utils/print-reports'
import { MAX_REFERENCE_LENGTH } from '@/lib/utils/product-references'
import { partRequestSchema } from './part-requests'
import { printReportSchema } from './print-reports'
import { referenceAttachmentSchema } from './search'
import { registerFilesSchema, sourceClickSchema } from './parts'
import { createProductSchema } from './products'

const PART_ID = '11111111-1111-4111-8111-111111111111'
const PRODUCT_ID = '22222222-2222-4222-8222-222222222222'
const REFERENCE_ID = '33333333-3333-4333-8333-333333333333'

describe('printReportSchema', () => {
  it('accepts a one-click report with no details', () => {
    expect(validate(printReportSchema, { partId: PART_ID, productId: PRODUCT_ID, result: 'works' })).toEqual({
      ok: true,
      data: { partId: PART_ID, productId: PRODUCT_ID, result: 'works', comment: null, productReferenceId: null },
    })
  })

  it('trims the comment and treats a blank one as none', () => {
    const withComment = validate(printReportSchema, {
      partId: PART_ID, productId: PRODUCT_ID, result: 'does_not_work', comment: '  too loose  ', productReferenceId: REFERENCE_ID,
    })
    expect(withComment).toMatchObject({ ok: true, data: { comment: 'too loose', productReferenceId: REFERENCE_ID } })

    const blank = validate(printReportSchema, { partId: PART_ID, productId: PRODUCT_ID, result: 'works', comment: '   ' })
    expect(blank).toMatchObject({ ok: true, data: { comment: null } })
  })

  it('rejects malformed payloads with the message of the field', () => {
    expect(validate(printReportSchema, null)).toEqual({ ok: false, error: 'Invalid report: expected a JSON object' })
    expect(validate(printReportSchema, { partId: 'x', productId: PRODUCT_ID, result: 'works' })).toEqual({
      ok: false,
      error: 'Invalid report: partId and productId must be UUIDs',
    })
    expect(validate(printReportSchema, { partId: PART_ID, productId: PRODUCT_ID, result: 'maybe' }).ok).toBe(false)
    expect(validate(printReportSchema, { partId: PART_ID, productId: PRODUCT_ID, result: 'works', comment: 42 }).ok).toBe(false)
    expect(validate(printReportSchema, { partId: PART_ID, productId: PRODUCT_ID, result: 'works', productReferenceId: 'ref' }).ok).toBe(false)
  })

  it('rejects a comment over the limit', () => {
    const comment = 'a'.repeat(MAX_PRINT_REPORT_COMMENT_LENGTH + 1)
    expect(validate(printReportSchema, { partId: PART_ID, productId: PRODUCT_ID, result: 'works', comment }).ok).toBe(false)
  })
})

describe('referenceAttachmentSchema', () => {
  it('accepts a product id and trims the value', () => {
    expect(validate(referenceAttachmentSchema, { productId: PRODUCT_ID, value: '  QP6520/20 ' })).toEqual({
      ok: true,
      data: { productId: PRODUCT_ID, value: 'QP6520/20' },
    })
  })

  it('rejects a missing or malformed product id', () => {
    expect(validate(referenceAttachmentSchema, { value: 'QP6520' }).ok).toBe(false)
    expect(validate(referenceAttachmentSchema, { productId: 'nope', value: 'QP6520' }).ok).toBe(false)
  })

  it('rejects values without a letter or digit, and overlong values', () => {
    expect(validate(referenceAttachmentSchema, { productId: PRODUCT_ID, value: ' -/- ' }).ok).toBe(false)
    expect(validate(referenceAttachmentSchema, { productId: PRODUCT_ID, value: 'A'.repeat(MAX_REFERENCE_LENGTH + 1) }).ok).toBe(false)
  })

  it('rejects a non-object body', () => {
    expect(validate(referenceAttachmentSchema, null).ok).toBe(false)
    expect(validate(referenceAttachmentSchema, 'QP6520').ok).toBe(false)
  })
})

describe('partRequestSchema', () => {
  it('strips control characters, trims, and reads blank context as null', () => {
    expect(validate(partRequestSchema, { description: ' Door\u0007 hinge ', rawQuery: '  ', pageUrl: null })).toEqual({
      ok: true,
      data: { description: 'Door hinge', rawQuery: null, pageUrl: null, productId: null },
    })
  })

  it('requires a description of at least two characters', () => {
    expect(validate(partRequestSchema, {})).toEqual({ ok: false, error: 'Description is required' })
    expect(validate(partRequestSchema, { description: 'a' })).toEqual({
      ok: false,
      error: 'Description must be at least 2 characters',
    })
  })

  it('rejects a malformed product id', () => {
    expect(validate(partRequestSchema, { description: 'Hinge', productId: 'nope' })).toEqual({
      ok: false,
      error: 'Invalid product id',
    })
  })
})

describe('sourceClickSchema', () => {
  it('accepts the two recorded contexts', () => {
    expect(validate(sourceClickSchema, { context: 'part_page' }).ok).toBe(true)
    expect(validate(sourceClickSchema, { context: 'card' }).ok).toBe(true)
  })

  it('rejects anything else, naming the expected values', () => {
    const error = { ok: false, error: 'Invalid context: expected one of part_page, card' }
    expect(validate(sourceClickSchema, { context: 'home' })).toEqual(error)
    expect(validate(sourceClickSchema, { context: 1 })).toEqual(error)
    expect(validate(sourceClickSchema, null)).toEqual(error)
  })
})

describe('registerFilesSchema', () => {
  const file = {
    originalName: 'hinge.stl',
    filename: '00-hinge.stl',
    extension: 'stl',
    size: 1024,
    path: 'user/part/files/00-hinge.stl',
    bucket: 'model-files',
    category: 'model',
  }
  const schema = registerFilesSchema(2)

  it('accepts a well-formed file entry', () => {
    expect(validate(schema, { files: [file] }).ok).toBe(true)
  })

  it('refuses a fractional size, which the bigint column cannot store', () => {
    expect(validate(schema, { files: [{ ...file, size: 1.5 }] })).toEqual({ ok: false, error: 'Invalid file size' })
  })

  it('refuses an empty list and a list over the limit', () => {
    expect(validate(schema, { files: [] })).toEqual({ ok: false, error: 'No files provided' })
    expect(validate(schema, { files: [file, file, file] })).toEqual({ ok: false, error: 'Too many files (max 2)' })
  })
})

describe('createProductSchema', () => {
  const valid = { name: 'Blender  X100', brandId: PRODUCT_ID, categoryId: PART_ID }

  it('normalizes the name as it is stored', () => {
    expect(validate(createProductSchema, valid)).toMatchObject({ ok: true, data: { name: 'Blender X100' } })
  })

  it('refuses a name over the 200 characters of products.name', () => {
    expect(validate(createProductSchema, { ...valid, name: 'a'.repeat(201) })).toEqual({
      ok: false,
      error: 'Name must be at most 200 characters',
    })
  })

  it('refuses a blank name', () => {
    expect(validate(createProductSchema, { ...valid, name: '   ' })).toEqual({ ok: false, error: 'Name is required' })
  })
})
