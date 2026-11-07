import { z } from 'zod'
import { uuid } from '@/lib/schemas/common'
import { MAX_PRINT_REPORT_COMMENT_LENGTH, PRINT_REPORT_RESULTS } from '@/lib/utils/print-reports'

/**
 * A print report (issue #318), submitted through the `reportPrint` Server Action. Comment and
 * reference are optional: an empty comment or a null reference means "none".
 */
export const printReportSchema = z.object({
  partId: uuid,
  productId: uuid,
  result: z.enum(PRINT_REPORT_RESULTS),
  comment: z
    .string()
    .trim()
    .max(MAX_PRINT_REPORT_COMMENT_LENGTH)
    .nullish()
    .transform((value) => value || null),
  productReferenceId: uuid.nullish().transform((value) => value ?? null),
})

export type PrintReportInput = z.output<typeof printReportSchema>
