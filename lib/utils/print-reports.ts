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
