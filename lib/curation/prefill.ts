import { getActiveSourcePlatforms } from '@/lib/supabase/queries/platforms'
import { getLicenseBySpdxId } from '@/lib/supabase/queries/licenses'
import {
  derivePrintablesPrintMetadata,
  derivePrintablesTexts,
  deriveThingiverseFields,
  parsePrintablesModelId,
  parseThingiverseThingId,
  PRINTABLES_LICENSE_TO_SPDX,
  type PrintablesPrintDetails,
  type ThingiverseThing,
} from '@/lib/curation/prefill-parsing'
import { PRINTABLES_BASE_URL, queryPrintables } from '@/lib/curation/printables-api'
import { getThingiverse, isThingiverseConfigured } from '@/lib/curation/thingiverse-api'
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
  /** The license declared at the source, as a `licenses` row id (#374). */
  licenseId: string | null
  // Details step — form-ready strings.
  description: string | null
  instructions: string | null
  material: string | null
  layerHeight: string | null
  estimatedPrintTime: string | null
  estimatedMaterialUsage: string | null
}

/**
 * The `licenses` row id of a mapped SPDX id, or null when there is no id or
 * no row — the license then stays empty for the curator.
 */
async function licenseIdForSpdx(spdxId: string | null | undefined): Promise<string | null> {
  if (!spdxId) return null
  const license = await getLicenseBySpdxId(spdxId)
  return license?.id ?? null
}

interface PrintablesPrintData {
  print?:
    | (PrintablesPrintDetails & {
        user?: { publicUsername?: string | null; handle?: string | null } | null
        license?: { abbreviation?: string | null } | null
        summary?: string | null
        description?: string | null
      })
    | null
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

  const data = await queryPrintables<PrintablesPrintData>(
    'query($id: ID!) { print(id: $id) { user { publicUsername handle } license { abbreviation } summary description printDuration weight materials { name } layerHeights } }',
    { id: printId },
  )
  const print = data?.print
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
  const licenseId = await licenseIdForSpdx(abbreviation ? PRINTABLES_LICENSE_TO_SPDX[abbreviation] : null)
  if (licenseId) result.licenseId = licenseId
  return result
}

/**
 * Thingiverse extractor: author, declared license, instructions and print
 * settings via the official REST API (#431). The license label is mapped
 * by THINGIVERSE_LICENSE_TO_SPDX; an unmapped label stays empty.
 * Inactive without THINGIVERSE_APP_TOKEN: no request is sent and only the
 * platform is detected. Returns {} on any failure. Never throws.
 */
async function extractFromThingiverse(url: URL): Promise<Partial<CurationPrefill>> {
  if (!isThingiverseConfigured()) return {}
  const thingId = parseThingiverseThingId(url)
  if (!thingId) return {}

  const thing = await getThingiverse<ThingiverseThing>(`/things/${thingId}`)
  if (!thing || typeof thing !== 'object') return {}
  const { licenseSpdxId, ...fields } = deriveThingiverseFields(thing)
  return { ...fields, licenseId: await licenseIdForSpdx(licenseSpdxId) }
}

/**
 * Per-platform extractors, keyed by source_platforms.slug. Platforms absent
 * from this registry still get platform detection — only author, license and
 * print metadata stay manual. Extractors run server-side only (issue #255:
 * the extraction code is not exposed publicly).
 */
const EXTRACTORS: Record<string, (url: URL) => Promise<Partial<CurationPrefill>>> = {
  printables: extractFromPrintables,
  thingiverse: extractFromThingiverse,
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
    licenseId: null,
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
