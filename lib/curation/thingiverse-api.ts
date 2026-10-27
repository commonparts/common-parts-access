/**
 * Minimal client for the official Thingiverse REST API (api.thingiverse.com).
 * Server-side only: it authenticates with the app token, which must never
 * reach the client (no NEXT_PUBLIC_ prefix, never logged, never returned).
 *
 * Inactive when THINGIVERSE_APP_TOKEN is not set: no request is sent and
 * every call returns null, so the curation flow keeps platform detection only.
 */

const THINGIVERSE_API_URL = 'https://api.thingiverse.com'
const REQUEST_TIMEOUT_MS = 5000

/** Identifies the platform to Thingiverse on every API request. */
export const THINGIVERSE_USER_AGENT =
  'CommonPartsAccess/1.0 (+https://access.commonparts.org; contact@commonparts.org)'

export const THINGIVERSE_BASE_URL = 'https://www.thingiverse.com'
/** Host serving the original image uploads listed by /things/{id}/images. */
export const THINGIVERSE_CDN_HOST = 'cdn.thingiverse.com'

function appToken(): string | null {
  return process.env.THINGIVERSE_APP_TOKEN?.trim() || null
}

/** Whether the Thingiverse extractor and image import can run. */
export function isThingiverseConfigured(): boolean {
  return appToken() !== null
}

/**
 * GETs an API path (e.g. `/things/3161`) and returns the parsed JSON body, or
 * null on any failure — token not configured, network, HTTP error (an unknown
 * Thing answers 404), malformed body, timeout. Never throws: every caller is
 * on a best-effort pre-fill path.
 */
export async function getThingiverse<T>(path: string): Promise<T | null> {
  const token = appToken()
  if (!token) return null
  try {
    const res = await fetch(`${THINGIVERSE_API_URL}${path}`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'User-Agent': THINGIVERSE_USER_AGENT,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) return null
    return ((await res.json().catch(() => null)) as T | null) ?? null
  } catch {
    return null
  }
}
