import { z } from 'zod'
import { isValidUuid } from '@/lib/utils/validation'
import { MAX_PRINT_REPORT_COMMENT_LENGTH, PRINT_REPORT_RESULTS } from '@/lib/utils/print-reports'

const IDS_MESSAGE = 'Invalid report: partId and productId must be UUIDs'

function reportId() {
  return z.string({ error: IDS_MESSAGE }).trim().refine(isValidUuid, { error: IDS_MESSAGE })
}

/**
 * POST /api/print-reports — a print report (issue #318). Comment and
 * reference are optional: an empty comment or a null reference means "none".
 */
export const printReportSchema = z.object(
  {
    partId: reportId(),
    productId: reportId(),
    result: z.enum(PRINT_REPORT_RESULTS, {
      error: `Invalid report: result must be one of ${PRINT_REPORT_RESULTS.join(', ')}`,
    }),
    comment: z
      .string({ error: 'Invalid report: comment must be a string' })
      .trim()
      .max(MAX_PRINT_REPORT_COMMENT_LENGTH, {
        error: `Invalid report: comment is limited to ${MAX_PRINT_REPORT_COMMENT_LENGTH} characters`,
      })
      .nullish()
      .transform((value) => value || null),
    productReferenceId: z
      .string({ error: 'Invalid report: productReferenceId must be a UUID' })
      .trim()
      .refine(isValidUuid, { error: 'Invalid report: productReferenceId must be a UUID' })
      .nullish()
      .transform((value) => value ?? null),
  },
  { error: 'Invalid report: expected a JSON object' },
)

export type PrintReportInput = z.output<typeof printReportSchema>
