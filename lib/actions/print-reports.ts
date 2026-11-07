'use server'

import { getTranslations } from 'next-intl/server'
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

/** The `Api` message of each refusal of the submission function. */
const SUBMISSION_ERRORS = {
  PRINT_REPORT_NOT_FOUND: 'reportPartNotLinked',
  PRINT_REPORT_INVALID_REFERENCE: 'reportInvalidReference',
  PRINT_REPORT_RATE_LIMITED: 'reportRateLimited',
} as const satisfies Record<PrintReportError, string>

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
  const parsed = await validate(printReportSchema, input)
  if (!parsed.ok) return parsed

  const t = await getTranslations('Api')
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    // No session is the anonymous case. Any other auth failure must not
    // silently file a signed-in user's report under a cookie identity.
    if (authError && !isAuthSessionMissingError(authError)) {
      console.error('Print report auth lookup failed:', authError)
      return { ok: false, error: t('reportSessionFailed') }
    }
    const userId = user?.id ?? null
    const reporterHash = await getReporterHash(userId)

    return { ok: true, data: await submitPrintReport({ ...parsed.data, reporterHash, userId }) }
  } catch (error) {
    if (error instanceof PrintReportSubmissionError) return { ok: false, error: t(SUBMISSION_ERRORS[error.code]) }
    console.error('Print report submission failed:', error)
    return { ok: false, error: t('reportFailed') }
  }
}
