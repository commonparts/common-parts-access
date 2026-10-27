import { htmlToPlainText } from '@/lib/utils/formatters'
import { MATERIAL_MAX_LENGTH } from '@/lib/utils/part-metadata'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'
import { normalizedHostname } from '@/lib/utils/validation'
import { THINGIVERSE_BASE_URL } from '@/lib/curation/thingiverse-api'

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

/** Trims a value to a column limit; over-limit text is cut, not dropped. */
function capped(value: string, maxLength: number): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.length <= maxLength ? trimmed : trimmed.slice(0, maxLength).trimEnd()
}

export interface PrintablesTexts {
  description: string | null
  instructions: string | null
}

/**
 * Maps Printables' text content onto the form fields: their `summary` (the
 * short line under the title) becomes the short description, and their rich
 * HTML `description` (the long body) becomes the instructions, converted to
 * plain text.
 */
export function derivePrintablesTexts(print: {
  summary?: string | null
  description?: string | null
}): PrintablesTexts {
  return {
    description: capped(print.summary ?? '', VALIDATION_LIMITS.PART.DESCRIPTION_MAX_LENGTH),
    instructions: capped(
      print.description ? htmlToPlainText(print.description) : '',
      VALIDATION_LIMITS.PART.INSTRUCTIONS_MAX_LENGTH,
    ),
  }
}

/**
 * Extracts the numeric Thing id from a Thingiverse URL: /thing:3161, with or
 * without a sub-path (/thing:3161/files). The host is checked by the caller.
 * Returns null when the path is not a Thing page.
 */
export function parseThingiverseThingId(url: URL): string | null {
  const firstSegment = url.pathname.split('/').filter(Boolean)[0] ?? ''
  const match = firstSegment.match(/^thing:(\d+)$/)
  return match ? match[1] : null
}

/**
 * The fields of a GET /things/{id} response the extractor reads. Names and
 * shapes verified against live API responses (#431):
 * - `description_html` is the Thing's Summary, the only free-text body the
 *   Thingiverse page shows. `instructions_html` is a leftover of an earlier
 *   page layout, empty on current Things, and is not read.
 * - print settings are the `data` entries of the `details_parts` item of
 *   type "settings", each value an HTML fragment such as
 *   "<div><p>0.2mm</p></div>".
 * - `license` is a label without a version, mapped by
 *   THINGIVERSE_LICENSE_TO_SPDX.
 */
export interface ThingiverseThing {
  creator?: { name?: string | null; public_url?: string | null } | null
  description_html?: string | null
  license?: string | null
  details_parts?: Array<{
    type?: string | null
    data?: Array<Record<string, unknown> | null> | null
  } | null> | null
}

export interface ThingiverseFields {
  originalAuthor: string | null
  originalAuthorUrl: string | null
  instructions: string | null
  material: string | null
  layerHeight: string | null
  /** SPDX id of the declared license, resolved to a `licenses` row by the caller. */
  licenseSpdxId: string | null
}

/**
 * Thingiverse license label (the API's `license` field) → SPDX id. The label
 * carries no version, but each Thing page links the license it declares;
 * every entry was checked against that link on live Thing pages, Things from
 * 2014 to 2023 included (#431) — they all link the version listed here.
 *
 * Labels left out have no exact `licenses` row and stay empty for the
 * curator: "Public Domain" links the retired Public Domain Certification
 * (not CC0), "GNU - GPL" links GPL 2.0, "GNU - LGPL" links LGPL 2.1, "BSD
 * License" links an unversioned BSD page, "All Rights Reserved" is not an
 * open license.
 */
export const THINGIVERSE_LICENSE_TO_SPDX: Record<string, string> = {
  'Creative Commons - Attribution': 'CC-BY-4.0',
  'Creative Commons - Attribution - Share Alike': 'CC-BY-SA-4.0',
  'Creative Commons - Attribution - No Derivatives': 'CC-BY-ND-4.0',
  'Creative Commons - Attribution - Non-Commercial': 'CC-BY-NC-4.0',
  'Creative Commons - Attribution - Non-Commercial - Share Alike': 'CC-BY-NC-SA-4.0',
  'Creative Commons - Attribution - Non-Commercial - No Derivatives': 'CC-BY-NC-ND-4.0',
  'Creative Commons - Public Domain Dedication': 'CC0-1.0',
}

/** SPDX id of a mapped Thingiverse license label, or null. Own keys only. */
function thingiverseLicenseSpdxId(label: unknown): string | null {
  if (typeof label !== 'string') return null
  const key = label.trim()
  return Object.hasOwn(THINGIVERSE_LICENSE_TO_SPDX, key) ? THINGIVERSE_LICENSE_TO_SPDX[key] : null
}

const THINGIVERSE_HOST = normalizedHostname(THINGIVERSE_BASE_URL)
const THINGIVERSE_SETTINGS_PART_TYPE = 'settings'
const THINGIVERSE_MATERIAL_KEY = 'filament_material'
const THINGIVERSE_LAYER_HEIGHT_KEY = 'resolution'
// Print settings are free text: designers write "NA" or "-" for "not given".
const NOT_GIVEN_VALUES = new Set(['na', 'n/a', 'none', '-'])
// A larger value is not a layer height in millimetres (microns, a typo):
// leave it for the curator rather than pre-fill a wrong number.
const MAX_PLAUSIBLE_LAYER_HEIGHT_MM = 1

/**
 * Distinct plain-text values of one print setting across the Thing's
 * settings entries, with empty and "not given" values dropped.
 */
function thingiverseSettingValues(thing: ThingiverseThing, key: string): string[] {
  const values = (thing.details_parts ?? [])
    .filter((part) => part?.type === THINGIVERSE_SETTINGS_PART_TYPE)
    .flatMap((part) => part?.data ?? [])
    .map((entry) => entry?.[key])
    .filter((value): value is string => typeof value === 'string')
    .map((value) => htmlToPlainText(value))
    .filter((value) => value && !NOT_GIVEN_VALUES.has(value.toLowerCase()))
  return [...new Set(values)]
}

/**
 * Derives the curation fields a Thing provides. Every field is null when
 * absent or ambiguous — a pre-filled value must never be a guess:
 * - author: the creator's user name, and their profile URL when it is on
 *   Thingiverse
 * - instructions: the Thing's Summary, as plain text, capped at the column
 *   limit. The short description stays empty: Thingiverse has no short
 *   summary, and the first 250 characters of the body are not one.
 * - material: the declared filament material, when a single one-line value
 *   is given
 * - layerHeight: the declared resolution, only when it is a single plain
 *   number of millimetres ("0.2", ".2", "0.2mm") of at most 1 mm
 * - licenseSpdxId: the declared license, when its label is mapped
 * Print time and material usage are not provided by the API and stay null.
 */
export function deriveThingiverseFields(thing: ThingiverseThing): ThingiverseFields {
  const name = thing.creator?.name?.trim() || null
  const profileUrl = thing.creator?.public_url?.trim() ?? ''
  const originalAuthorUrl =
    name && profileUrl.startsWith('https://') && normalizedHostname(profileUrl) === THINGIVERSE_HOST
      ? profileUrl
      : null

  const materials = thingiverseSettingValues(thing, THINGIVERSE_MATERIAL_KEY)
  // The material field is a single line: a multi-paragraph answer is prose.
  const material =
    materials.length === 1 && !materials[0].includes('\n') && materials[0].length <= MATERIAL_MAX_LENGTH
      ? materials[0]
      : null

  const resolutions = thingiverseSettingValues(thing, THINGIVERSE_LAYER_HEIGHT_KEY)
  let layerHeight: string | null = null
  const resolutionMatch = resolutions.length === 1 ? resolutions[0].match(/^(\d*\.?\d+)\s*(mm)?$/i) : null
  if (resolutionMatch) {
    const parsed = Number.parseFloat(resolutionMatch[1])
    if (parsed > 0 && parsed <= MAX_PLAUSIBLE_LAYER_HEIGHT_MM) layerHeight = String(parsed)
  }

  return {
    originalAuthor: name,
    originalAuthorUrl,
    instructions: capped(
      typeof thing.description_html === 'string' ? htmlToPlainText(thing.description_html) : '',
      VALIDATION_LIMITS.PART.INSTRUCTIONS_MAX_LENGTH,
    ),
    material,
    layerHeight,
    licenseSpdxId: thingiverseLicenseSpdxId(thing.license),
  }
}
