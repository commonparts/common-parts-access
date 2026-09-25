import { NextRequest, NextResponse } from 'next/server'
import { isAuthSessionMissingError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import {
  PrintReportSubmissionError,
  submitPrintReport,
  type PrintReportError,
} from '@/lib/supabase/queries/print-reports'
import { validatePrintReport } from '@/lib/utils/print-reports'
import { getReporterHash } from '@/lib/utils/reporter-session'

export const runtime = 'nodejs'

const SUBMISSION_ERROR_RESPONSES: Record<PrintReportError, { error: string; status: number }> = {
  PRINT_REPORT_NOT_FOUND: { error: 'Report failed: this part is not published or not linked to that product', status: 404 },
  PRINT_REPORT_INVALID_REFERENCE: { error: 'Report failed: the reference does not belong to that product', status: 400 },
  PRINT_REPORT_RATE_LIMITED: { error: 'Too many reports from this session, try again in an hour', status: 429 },
}

/**
 * POST /api/print-reports — files a print report (issue #318). Open to
 * anonymous visitors; a signed-in user is recorded on the report. Reporting
 * again on the same part–product pair replaces the earlier report, which is
 * also how the optional comment and reference are added after the one-click
 * result. Responds with the pair's fresh counters and evidence level.
 */
export async function POST(request: NextRequest) {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid report: body must be JSON' }, { status: 400 })
  }

  const validation = validatePrintReport(payload)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    // No session is the anonymous case. Any other auth failure must not
    // silently file a signed-in user's report under a cookie identity.
    if (authError && !isAuthSessionMissingError(authError)) {
      console.error('Print report auth lookup failed:', authError)
      return NextResponse.json({ error: 'Report failed: could not verify your session, please try again' }, { status: 503 })
    }
    const userId = user?.id ?? null
    const reporterHash = await getReporterHash(userId)

    const stats = await submitPrintReport({ ...validation.value, reporterHash, userId })
    return NextResponse.json({ stats }, { status: 201 })
  } catch (error) {
    if (error instanceof PrintReportSubmissionError) {
      const { error: message, status } = SUBMISSION_ERROR_RESPONSES[error.code]
      return NextResponse.json({ error: message }, { status })
    }
    console.error('Print report submission failed:', error)
    return NextResponse.json({ error: 'Report failed: please try again' }, { status: 500 })
  }
}
