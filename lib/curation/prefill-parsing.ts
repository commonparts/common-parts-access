import { MATERIAL_MAX_LENGTH } from '@/lib/utils/model-metadata'

/**
 * Pure parsing and mapping logic for curation pre-fill (no I/O) — split from
 * prefill.ts so it can be unit-tested without the Supabase import chain.
 */

// Maps Printables' license catalog (their GraphQL `abbreviation` field, all
// values verified against the live API) onto the SPDX ids carried by the
// licenses table. Licenses absent here (GPL 2.0, LGPL, BSD, SDFL, the
// Commercial and OCL variants, CERN-OHL) have no row in the registry — they
// stay unmapped and the curator picks manually.
export const PRINTABLES_LICENSE_TO_SPDX: Record<string, string> = {
  'CC0': 'CC0-1.0',
  'CC-BY': 'CC-BY-4.0',
  'CC-BY-SA': 'CC-BY-SA-4.0',
  'CC-BY-ND': 'CC-BY-ND-4.0',
  'CC-BY-NC': 'CC-BY-NC-4.0',
  'CC-BY-NC-SA': 'CC-BY-NC-SA-4.0',
  'CC-BY-NC-ND': 'CC-BY-NC-ND-4.0',
  'GPL 3.0': 'GPL-3.0-only',
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

/** Print-metadata portion of the Printables GraphQL print response. */
export interface PrintablesPrintDetails {
  printDuration?: string | null
  weight?: string | null
  materials?: Array<{ name?: string | null } | null> | null
  layerHeights?: Array<string | null> | null
}

export interface PrintablesPrintMetadata {
  material: string | null
  layerHeight: string | null
  estimatedPrintTime: string | null
  estimatedMaterialUsage: string | null
}

/**
 * Derives form-ready print metadata from a Printables print. Every field is
 * null when absent or ambiguous — a pre-filled value must never be a guess:
 * - material: distinct material names joined (free-text field)
 * - layerHeight: only when all listed gcodes agree on a single value
 * - estimatedPrintTime: printDuration is decimal HOURS (verified against
 *   gcode filenames: "_8m" → 0.14, "_2h" → 2.08) → whole minutes
 * - estimatedMaterialUsage: weight is grams, passed through
 */
export function derivePrintablesPrintMetadata(print: PrintablesPrintDetails): PrintablesPrintMetadata {
  const names = [
    ...new Set(
      (print.materials ?? [])
        .map((m) => m?.name?.trim())
        .filter((name): name is string => Boolean(name)),
    ),
  ]
  const joinedMaterial = names.join(', ')
  const material = joinedMaterial && joinedMaterial.length <= MATERIAL_MAX_LENGTH ? joinedMaterial : null

  const heights = [
    ...new Set(
      (print.layerHeights ?? [])
        .map((v) => v?.trim())
        .filter((v): v is string => Boolean(v)),
    ),
  ]
  let layerHeight: string | null = null
  if (heights.length === 1) {
    const parsed = Number.parseFloat(heights[0])
    if (Number.isFinite(parsed) && parsed > 0) layerHeight = String(parsed)
  }

  const hours = Number.parseFloat(print.printDuration ?? '')
  const estimatedPrintTime =
    Number.isFinite(hours) && hours > 0 ? String(Math.round(hours * 60)) : null

  const grams = Number.parseFloat(print.weight ?? '')
  const estimatedMaterialUsage =
    Number.isFinite(grams) && grams > 0 ? String(grams) : null

  return { material, layerHeight, estimatedPrintTime, estimatedMaterialUsage }
}
