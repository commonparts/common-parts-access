'use server'

import type { z } from 'zod'
import { isAuthSessionMissingError } from '@supabase/supabase-js'
import { validate, type Result } from '@/lib/api/parse'
import { printReportSchema } from '@/lib/schemas/print-reports'
import { createClient } from '@/lib/supabase/server'
import {
  PrintReportSubmissionError,
  submitPrintReport,
  type PrintReportError,
} from '@/lib/supabase/queries/print-reports'
import type { PrintReportStats } from '@/lib/utils/print-reports'
import { getReporterHash } from '@/lib/utils/reporter-session'

const SUBMISSION_ERRORS: Record<PrintReportError, string> = {
  PRINT_REPORT_NOT_FOUND: 'Report failed: this part is not published or not linked to that product',
  PRINT_REPORT_INVALID_REFERENCE: 'Report failed: the reference does not belong to that product',
  PRINT_REPORT_RATE_LIMITED: 'Too many reports from this session, try again in an hour',
}

/**
 * Files a print report (issue #318) and returns the pair's fresh counters.
 * Open to anonymous visitors; a signed-in user is recorded on the report.
 * Reporting again on the same part–product pair replaces the earlier report,
 * which is how the optional comment and reference are added after the
 * one-click result.
 */
export async function reportPrint(
  input: z.input<typeof printReportSchema>,
): Promise<Result<PrintReportStats>> {
  const parsed = validate(printReportSchema, input)
  if (!parsed.ok) return parsed

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    // No session is the anonymous case. Any other auth failure must not
    // silently file a signed-in user's report under a cookie identity.
    if (authError && !isAuthSessionMissingError(authError)) {
      console.error('Print report auth lookup failed:', authError)
      return { ok: false, error: 'Report failed: could not verify your session, please try again' }
    }
    const userId = user?.id ?? null
    const reporterHash = await getReporterHash(userId)

    return { ok: true, data: await submitPrintReport({ ...parsed.data, reporterHash, userId }) }
  } catch (error) {
    if (error instanceof PrintReportSubmissionError) return { ok: false, error: SUBMISSION_ERRORS[error.code] }
    console.error('Print report submission failed:', error)
    return { ok: false, error: 'Report failed: please try again' }
  }
}
