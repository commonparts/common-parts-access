import { getActiveSourcePlatforms } from '@/lib/supabase/queries/platforms'
import { getLicenseBySpdxId } from '@/lib/supabase/queries/licenses'
import {
  derivePrintablesPrintMetadata,
  derivePrintablesTexts,
  parsePrintablesModelId,
  PRINTABLES_LICENSE_TO_SPDX,
  type PrintablesPrintDetails,
} from '@/lib/curation/prefill-parsing'
import { normalizedHostname } from '@/lib/utils/validation'

/**
 * Pre-fill extracted from a source URL for the curation tool (Flow P3 §4.3
 * step 2). Every field is best-effort: null means "nothing extractable",
 * and the curator can always override what was extracted.
 */
export interface CurationPrefill {
  sourcePlatform: string | null
  originalAuthor: string | null
  originalAuthorUrl: string | null
  sourceLicenseId: string | null
  // Details step — form-ready strings.
  description: string | null
  instructions: string | null
  material: string | null
  layerHeight: string | null
  estimatedPrintTime: string | null
  estimatedMaterialUsage: string | null
}

const EXTRACTION_TIMEOUT_MS = 5000

const PRINTABLES_GRAPHQL_URL = 'https://api.printables.com/graphql/'
const PRINTABLES_BASE_URL = 'https://www.printables.com'

interface PrintablesPrintResponse {
  data?: {
    print?:
      | (PrintablesPrintDetails & {
          user?: { publicUsername?: string | null; handle?: string | null } | null
          license?: { abbreviation?: string | null } | null
          summary?: string | null
          description?: string | null
        })
      | null
  } | null
}

/**
 * Printables extractor: author, declared license and print metadata via the
 * platform's public GraphQL API (the same endpoint the Printables web app
 * calls). Returns {} on any failure — network, unknown id, shape change.
 * Never throws.
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
          'query($id: ID!) { print(id: $id) { user { publicUsername handle } license { abbreviation } summary description printDuration weight materials { name } layerHeights } }',
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

  // Null fields are fine here: Object.assign onto the all-null prefill base
  // is a no-op for them.
  const result: Partial<CurationPrefill> = {
    ...derivePrintablesPrintMetadata(print),
    ...derivePrintablesTexts(print),
  }
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
 * from this registry still get platform detection — only author, license and
 * print metadata stay manual. Extractors run server-side only (issue #255:
 * the extraction code is not exposed publicly).
 */
const EXTRACTORS: Record<string, (url: URL) => Promise<Partial<CurationPrefill>>> = {
  printables: extractFromPrintables,
}

/**
 * Derives whatever the source URL yields for the curation session:
 * the platform (URL host matched against source_platforms.base_url) and,
 * where an extractor exists, the author, declared license and print
 * metadata. Extraction failure never blocks the flow — partial results
 * come back as-is and missing fields stay null (Flow P3 §4.4).
 */
export async function getPrefillFromSourceUrl(sourceUrl: string): Promise<CurationPrefill> {
  const prefill: CurationPrefill = {
    sourcePlatform: null,
    originalAuthor: null,
    originalAuthorUrl: null,
    sourceLicenseId: null,
    description: null,
    instructions: null,
    material: null,
    layerHeight: null,
    estimatedPrintTime: null,
    estimatedMaterialUsage: null,
  }

  const sourceHost = normalizedHostname(sourceUrl)
  if (!sourceHost) return prefill

  // Pre-fill is advisory: if the platform list cannot be loaded, return the
  // empty prefill instead of erroring — the curator just fills manually.
  let platforms
  try {
    platforms = await getActiveSourcePlatforms()
  } catch (error) {
    console.error('Curation prefill: failed to load source platforms', error)
    return prefill
  }
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
