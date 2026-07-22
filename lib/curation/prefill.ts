import { getActiveSourcePlatforms } from '@/lib/supabase/queries/platforms'
import { getLicenseBySpdxId } from '@/lib/supabase/queries/licenses'
import { normalizedHostname } from '@/lib/utils/validation'

/**
 * Pre-fill extracted from a source URL for the curation source step (Flow P3
 * §4.3 step 2). Every field is best-effort: null means "nothing extractable",
 * and the curator can always override what was extracted.
 */
export interface CurationPrefill {
  sourcePlatform: string | null
  originalAuthor: string | null
  originalAuthorUrl: string | null
  sourceLicenseId: string | null
}

const EXTRACTION_TIMEOUT_MS = 5000

const PRINTABLES_GRAPHQL_URL = 'https://api.printables.com/graphql/'
const PRINTABLES_BASE_URL = 'https://www.printables.com'

// Maps Printables' license catalog (their GraphQL `abbreviation` field, all
// values verified against the live API) onto the SPDX ids carried by the
// licenses table. Licenses absent here (GPL 2.0, LGPL, BSD, SDFL, the
// Commercial and OCL variants, CERN-OHL) have no row in the registry — they
// stay unmapped and the curator picks manually.
const PRINTABLES_LICENSE_TO_SPDX: Record<string, string> = {
  'CC0': 'CC0-1.0',
  'CC-BY': 'CC-BY-4.0',
  'CC-BY-SA': 'CC-BY-SA-4.0',
  'CC-BY-ND': 'CC-BY-ND-4.0',
  'CC-BY-NC': 'CC-BY-NC-4.0',
  'CC-BY-NC-SA': 'CC-BY-NC-SA-4.0',
  'CC-BY-NC-ND': 'CC-BY-NC-ND-4.0',
  'GPL 3.0': 'GPL-3.0-only',
}

interface PrintablesPrintResponse {
  data?: {
    print?: {
      user?: { publicUsername?: string | null; handle?: string | null } | null
      license?: { abbreviation?: string | null } | null
    } | null
  } | null
}

/**
 * Extracts the numeric print id from a Printables model URL. Handles the
 * canonical form (/model/3161-3d-benchy), a bare id (/model/3161) and an
 * optional leading locale segment (/cs/model/3161-…). Returns null when the
 * path is not a model page.
 */
export function parsePrintablesModelId(url: URL): string | null {
  const segments = url.pathname.split('/').filter(Boolean)
  const modelIndex = segments.indexOf('model')
  if (modelIndex === -1 || modelIndex + 1 >= segments.length) return null
  const idMatch = segments[modelIndex + 1].match(/^(\d+)/)
  return idMatch ? idMatch[1] : null
}

/**
 * Printables extractor: author and declared license via the platform's
 * public GraphQL API (the same endpoint the Printables web app calls).
 * Returns {} on any failure — network, unknown id, shape change. Never throws.
 */
async function extractFromPrintables(url: URL): Promise<Partial<CurationPrefill>> {
  const printId = parsePrintablesModelId(url)
  if (!printId) return {}

  let json: PrintablesPrintResponse | null = null
  try {
    const res = await fetch(PRINTABLES_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(EXTRACTION_TIMEOUT_MS),
      body: JSON.stringify({
        query:
          'query($id: ID!) { print(id: $id) { user { publicUsername handle } license { abbreviation } } }',
        variables: { id: printId },
      }),
    })
    if (!res.ok) return {}
    json = (await res.json().catch(() => null)) as PrintablesPrintResponse | null
  } catch {
    return {}
  }

  const print = json?.data?.print
  if (!print) return {}

  const result: Partial<CurationPrefill> = {}
  if (print.user?.publicUsername) result.originalAuthor = print.user.publicUsername
  if (print.user?.handle) result.originalAuthorUrl = `${PRINTABLES_BASE_URL}/@${print.user.handle}`

  const abbreviation = print.license?.abbreviation
  const spdxId = abbreviation ? PRINTABLES_LICENSE_TO_SPDX[abbreviation] : undefined
  if (spdxId) {
    const license = await getLicenseBySpdxId(spdxId)
    if (license) result.sourceLicenseId = license.id
  }
  return result
}

/**
 * Per-platform extractors, keyed by source_platforms.slug. Platforms absent
 * from this registry still get platform detection — only author and license
 * stay manual. Extractors run server-side only (issue #255: the extraction
 * code is not exposed publicly).
 */
const EXTRACTORS: Record<string, (url: URL) => Promise<Partial<CurationPrefill>>> = {
  printables: extractFromPrintables,
}

/**
 * Derives whatever the source URL yields for the curation source step:
 * the platform (URL host matched against source_platforms.base_url) and,
 * where an extractor exists, the author and declared license. Extraction
 * failure never blocks the flow — partial results come back as-is and
 * missing fields stay null (Flow P3 §4.4).
 */
export async function getPrefillFromSourceUrl(sourceUrl: string): Promise<CurationPrefill> {
  const prefill: CurationPrefill = {
    sourcePlatform: null,
    originalAuthor: null,
    originalAuthorUrl: null,
    sourceLicenseId: null,
  }

  const sourceHost = normalizedHostname(sourceUrl)
  if (!sourceHost) return prefill

  const platforms = await getActiveSourcePlatforms()
  const platform = platforms.find(
    (p) => p.base_url && normalizedHostname(p.base_url) === sourceHost,
  )
  if (!platform) return prefill
  prefill.sourcePlatform = platform.slug

  const extractor = EXTRACTORS[platform.slug]
  if (extractor) {
    try {
      Object.assign(prefill, await extractor(new URL(sourceUrl)))
    } catch (error) {
      // Best-effort by contract: platform detection alone is still useful.
      console.error(`Curation prefill extraction failed for ${platform.slug}`, error)
    }
  }
  return prefill
}
