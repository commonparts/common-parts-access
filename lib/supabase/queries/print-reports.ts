import { createAdminClient } from '@/lib/supabase/admin'
import type { PrintReportInput } from '@/lib/schemas/print-reports'
import { toPrintReportStats, type PrintReportStats } from '@/lib/utils/print-reports'

/** Domain errors raised by `submit_print_report()`, matched on the message. */
const PRINT_REPORT_ERRORS = [
  'PRINT_REPORT_NOT_FOUND',
  'PRINT_REPORT_INVALID_REFERENCE',
  'PRINT_REPORT_RATE_LIMITED',
] as const
export type PrintReportError = (typeof PRINT_REPORT_ERRORS)[number]

export class PrintReportSubmissionError extends Error {
  constructor(public readonly code: PrintReportError) {
    super(code)
  }
}

/**
 * Records or replaces a print report and returns the pair's fresh counters.
 *
 * Uses the service role: `submit_print_report()` is executable by the service
 * role only, so the `reportPrint` Server Action, which owns the reporter
 * cookie and therefore the rate limit, is the single way in. `print_reports` has RLS enabled and no
 * policy; the function is security definer and checks the part is published.
 */
export async function submitPrintReport(
  input: PrintReportInput & { reporterHash: string; userId: string | null },
): Promise<PrintReportStats> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .rpc('submit_print_report', {
      p_reporter_hash: input.reporterHash,
      // Cast: the generator types every argument without a default as
      // non-null, but p_user_id is null for an anonymous reporter, and the
      // function stores it as is.
      p_user_id: input.userId as string,
      p_part_id: input.partId,
      p_product_id: input.productId,
      p_result: input.result,
      // Omitted rather than null: both arguments default to null.
      p_comment: input.comment ?? undefined,
      p_product_reference_id: input.productReferenceId ?? undefined,
    })
    .single()

  if (error) {
    const code = PRINT_REPORT_ERRORS.find((known) => known === error.message)
    if (code) throw new PrintReportSubmissionError(code)
    throw error
  }

  return toPrintReportStats(data)
}
