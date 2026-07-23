/**
 * Minimal client for the public Printables GraphQL API — the same endpoint
 * the Printables web app calls. Server-side only (issue #255: extraction
 * code is not exposed publicly).
 */

const PRINTABLES_GRAPHQL_URL = 'https://api.printables.com/graphql/'
const REQUEST_TIMEOUT_MS = 5000

export const PRINTABLES_BASE_URL = 'https://www.printables.com'
export const PRINTABLES_MEDIA_BASE_URL = 'https://media.printables.com'

/**
 * POSTs a GraphQL query and returns the `data` payload, or null on any
 * failure — network, HTTP error, malformed body, timeout. Never throws:
 * every caller is on a best-effort pre-fill path.
 */
export async function queryPrintables<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T | null> {
  try {
    const res = await fetch(PRINTABLES_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({ query, variables }),
    })
    if (!res.ok) return null
    const json = (await res.json().catch(() => null)) as { data?: T | null } | null
    return json?.data ?? null
  } catch {
    return null
  }
}
