import { describe, expect, it } from 'vitest'
import { MAX_PRINT_REPORT_COMMENT_LENGTH, toPrintReportStats, validatePrintReport } from './print-reports'

const PART_ID = '11111111-1111-4111-8111-111111111111'
const PRODUCT_ID = '22222222-2222-4222-8222-222222222222'
const REFERENCE_ID = '33333333-3333-4333-8333-333333333333'

describe('validatePrintReport', () => {
  it('accepts a one-click report with no details', () => {
    expect(validatePrintReport({ partId: PART_ID, productId: PRODUCT_ID, result: 'works' })).toEqual({
      ok: true,
      value: { partId: PART_ID, productId: PRODUCT_ID, result: 'works', comment: null, productReferenceId: null },
    })
  })

  it('trims the comment and treats a blank one as none', () => {
    const withComment = validatePrintReport({
      partId: PART_ID, productId: PRODUCT_ID, result: 'does_not_work', comment: '  too loose  ', productReferenceId: REFERENCE_ID,
    })
    expect(withComment).toMatchObject({ ok: true, value: { comment: 'too loose', productReferenceId: REFERENCE_ID } })

    const blank = validatePrintReport({ partId: PART_ID, productId: PRODUCT_ID, result: 'works', comment: '   ' })
    expect(blank).toMatchObject({ ok: true, value: { comment: null } })
  })

  it('rejects malformed payloads', () => {
    expect(validatePrintReport(null).ok).toBe(false)
    expect(validatePrintReport({ partId: 'x', productId: PRODUCT_ID, result: 'works' }).ok).toBe(false)
    expect(validatePrintReport({ partId: PART_ID, productId: PRODUCT_ID, result: 'maybe' }).ok).toBe(false)
    expect(validatePrintReport({ partId: PART_ID, productId: PRODUCT_ID, result: 'works', comment: 42 }).ok).toBe(false)
    expect(validatePrintReport({ partId: PART_ID, productId: PRODUCT_ID, result: 'works', productReferenceId: 'ref' }).ok).toBe(false)
  })

  it('rejects a comment over the limit', () => {
    const comment = 'a'.repeat(MAX_PRINT_REPORT_COMMENT_LENGTH + 1)
    expect(validatePrintReport({ partId: PART_ID, productId: PRODUCT_ID, result: 'works', comment }).ok).toBe(false)
  })
})

describe('toPrintReportStats', () => {
  it('maps counter columns and defaults missing values', () => {
    expect(toPrintReportStats({
      works_count: 2, works_with_adjustments_count: null, does_not_work_count: 1, evidence_level: 'confirmed',
    })).toEqual({ works: 2, worksWithAdjustments: 0, doesNotWork: 1, evidenceLevel: 'confirmed' })
  })
})
