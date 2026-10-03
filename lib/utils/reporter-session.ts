import crypto from 'crypto'
import { cookies } from 'next/headers'
import { isValidUuid } from './validation'

/**
 * Reporter identity for print reports (issue #318). Server-only: call it from
 * a Route Handler, where `cookies()` can also set the cookie.
 */

const REPORTER_COOKIE_NAME = 'cpa_reporter'
const REPORTER_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

/**
 * Returns the hash identifying who files a print report, used to replace a
 * reporter's earlier report on the same pair and to rate-limit per session.
 * Signed-in users are keyed by their user id so their reports follow them
 * across devices. Anonymous visitors get a random id in an httpOnly cookie,
 * set on their first report. Only the hash is stored, never an IP address.
 */
export async function getReporterHash(userId: string | null): Promise<string> {
  if (userId) return sha256(`user:${userId}`)

  const cookieStore = await cookies()
  let reporterId = cookieStore.get(REPORTER_COOKIE_NAME)?.value ?? ''

  if (!isValidUuid(reporterId)) {
    reporterId = crypto.randomUUID()
    cookieStore.set(REPORTER_COOKIE_NAME, reporterId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: REPORTER_COOKIE_MAX_AGE_SECONDS,
    })
  }

  return sha256(`anon:${reporterId}`)
}
