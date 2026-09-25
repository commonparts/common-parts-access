import { isValidUuid, trimmedString } from './validation'
import { toEvidenceLevel, type EvidenceLevel } from './evidence-level'

/**
 * What a reporter says about a printed part on one product (issue #318).
 * Mirrors the check constraint on `print_reports.result`.
 */
export const PRINT_REPORT_RESULTS = ['works', 'works_with_adjustments', 'does_not_work'] as const
export type PrintReportResult = (typeof PRINT_REPORT_RESULTS)[number]

/** Mirrors the check constraint on `print_reports.comment`. */
export const MAX_PRINT_REPORT_COMMENT_LENGTH = 280

/** Report counters and the evidence level they derive, for one part–product pair. */
export interface PrintReportStats {
  works: number
  worksWithAdjustments: number
  doesNotWork: number
  evidenceLevel: EvidenceLevel
}

/** Counter columns of `part_products`, as read from the database. */
export interface PrintReportStatsRow {
  works_count: number | null
  works_with_adjustments_count: number | null
  does_not_work_count: number | null
  evidence_level: string | null
}

/** Maps the `part_products` counter columns to the payload shape. */
export function toPrintReportStats(row: PrintReportStatsRow): PrintReportStats {
  return {
    works: row.works_count ?? 0,
    worksWithAdjustments: row.works_with_adjustments_count ?? 0,
    doesNotWork: row.does_not_work_count ?? 0,
    evidenceLevel: toEvidenceLevel(row.evidence_level),
  }
}

export interface PrintReportInput {
  partId: string
  productId: string
  result: PrintReportResult
  comment: string | null
  productReferenceId: string | null
}

export type PrintReportValidation =
  | { ok: true; value: PrintReportInput }
  | { ok: false; error: string }

/**
 * Validates an untrusted print report payload. Comment and reference are
 * optional: an empty comment or a null reference means "none". Returns the
 * sanitized input or an actionable error; never throws.
 */
export function validatePrintReport(payload: unknown): PrintReportValidation {
  if (typeof payload !== 'object' || payload === null) {
    return { ok: false, error: 'Invalid report: expected a JSON object' }
  }
  const body = payload as Record<string, unknown>

  const partId = trimmedString(body.partId)
  const productId = trimmedString(body.productId)
  if (!isValidUuid(partId) || !isValidUuid(productId)) {
    return { ok: false, error: 'Invalid report: partId and productId must be UUIDs' }
  }

  if (!PRINT_REPORT_RESULTS.includes(body.result as PrintReportResult)) {
    return { ok: false, error: `Invalid report: result must be one of ${PRINT_REPORT_RESULTS.join(', ')}` }
  }

  if (body.comment != null && typeof body.comment !== 'string') {
    return { ok: false, error: 'Invalid report: comment must be a string' }
  }
  const comment = trimmedString(body.comment)
  if (comment.length > MAX_PRINT_REPORT_COMMENT_LENGTH) {
    return { ok: false, error: `Invalid report: comment is limited to ${MAX_PRINT_REPORT_COMMENT_LENGTH} characters` }
  }

  let productReferenceId: string | null = null
  if (body.productReferenceId != null) {
    const reference = trimmedString(body.productReferenceId)
    if (!isValidUuid(reference)) {
      return { ok: false, error: 'Invalid report: productReferenceId must be a UUID' }
    }
    productReferenceId = reference
  }

  return {
    ok: true,
    value: {
      partId,
      productId,
      result: body.result as PrintReportResult,
      comment: comment || null,
      productReferenceId,
    },
  }
}
