import { describe, expect, it } from 'vitest'
import { toPrintReportStats } from './print-reports'

describe('toPrintReportStats', () => {
  it('maps counter columns and defaults missing values', () => {
    expect(toPrintReportStats({
      works_count: 2, works_with_adjustments_count: null, does_not_work_count: 1, evidence_level: 'confirmed',
    })).toEqual({ works: 2, worksWithAdjustments: 0, doesNotWork: 1, evidenceLevel: 'confirmed' })
  })
})
