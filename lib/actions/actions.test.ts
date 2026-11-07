import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthApiError, AuthSessionMissingError } from '@supabase/supabase-js'
import { PrintReportSubmissionError } from '@/lib/supabase/queries/print-reports'

const PART_ID = '11111111-1111-4111-8111-111111111111'
const PRODUCT_ID = '22222222-2222-4222-8222-222222222222'
const STATS = { works: 1, worksWithAdjustments: 0, doesNotWork: 0, evidenceLevel: 'printed_and_reported' }

const { getUser, submitPrintReport, createPartRequest } = vi.hoisted(() => ({
  getUser: vi.fn(),
  submitPrintReport: vi.fn(),
  createPartRequest: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser } }) }))
vi.mock('@/lib/utils/reporter-session', () => ({ getReporterHash: async (userId: string | null) => `hash:${userId}` }))
vi.mock('@/lib/supabase/queries/print-reports', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/queries/print-reports')>()),
  submitPrintReport,
}))
vi.mock('@/lib/supabase/queries/part-requests', () => ({ createPartRequest }))

const { reportPrint } = await import('./print-reports')
const { requestPart } = await import('./part-requests')

const report = { partId: PART_ID, productId: PRODUCT_ID, result: 'works' as const }

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  getUser.mockResolvedValue({ data: { user: null }, error: new AuthSessionMissingError() })
  submitPrintReport.mockResolvedValue(STATS)
})

describe('reportPrint', () => {
  it('files an anonymous report under the cookie identity', async () => {
    expect(await reportPrint(report)).toEqual({ ok: true, data: STATS })
    expect(submitPrintReport).toHaveBeenCalledWith({
      ...report,
      comment: null,
      productReferenceId: null,
      reporterHash: 'hash:null',
      userId: null,
    })
  })

  it('records the signed-in user', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null })
    await reportPrint(report)
    expect(submitPrintReport).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', reporterHash: 'hash:user-1' }))
  })

  it('rejects invalid input before any lookup', async () => {
    expect(await reportPrint({ ...report, partId: 'x' })).toEqual({
      ok: false,
      error: 'partId: Invalid identifier',
    })
    expect(getUser).not.toHaveBeenCalled()
  })

  it('refuses to file when the session cannot be verified', async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new AuthApiError('down', 500, undefined) })
    expect(await reportPrint(report)).toEqual({
      ok: false,
      error: 'Report failed: your session could not be verified. Please try again.',
    })
    expect(submitPrintReport).not.toHaveBeenCalled()
  })

  it('maps domain errors and hides unexpected ones', async () => {
    submitPrintReport.mockRejectedValueOnce(new PrintReportSubmissionError('PRINT_REPORT_RATE_LIMITED'))
    expect(await reportPrint(report)).toEqual({ ok: false, error: 'Too many reports from this session, try again in an hour' })

    submitPrintReport.mockRejectedValueOnce(new Error('db down'))
    expect(await reportPrint(report)).toEqual({ ok: false, error: 'Report failed: please try again' })
  })
})

describe('requestPart', () => {
  it('stores a valid request', async () => {
    expect(await requestPart({ description: '  Door hinge ', productId: PRODUCT_ID })).toEqual({ ok: true, data: null })
    expect(createPartRequest).toHaveBeenCalledWith({
      description: 'Door hinge',
      productId: PRODUCT_ID,
      rawQuery: null,
      pageUrl: null,
    })
  })

  it('rejects a description that is too short', async () => {
    expect(await requestPart({ description: 'x' })).toEqual({
      ok: false,
      error: 'Description: Too small: expected string to have >=2 characters',
    })
    expect(createPartRequest).not.toHaveBeenCalled()
  })
})
