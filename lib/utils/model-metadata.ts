import type { ModelDimensions, ModelPrintSettings } from '@/types/database'

/**
 * Parsing and validation for a model's physical/print metadata — dimensions,
 * print settings, material, colour and print estimates. Shared by the public
 * upload route and the internal curation draft route so both apply identical
 * rules. Parsers never throw: they return a discriminated ParseResult the
 * caller maps to a 400.
 */

export const ALLOWED_DIMENSION_UNITS = ['mm', 'cm', 'in'] as const
export const ALLOWED_SUPPORT_TYPES = ['none', 'buildplate_only', 'everywhere'] as const

// Column length limits mirrored from the models table CHECK constraints.
export const MATERIAL_MAX_LENGTH = 100
export const COLOR_MAX_LENGTH = 50

export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string }

export function parseNonNegativeInt(value: string, field: string): ParseResult<number> {
  const parsed = Number(value)
  // isSafeInteger (not isInteger) so values above 2^53 are rejected rather than
  // silently rounded when stored in the bigint columns (e.g. estimated_print_time).
  if (!Number.isSafeInteger(parsed)) return { ok: false, error: `${field} must be a valid integer` }
  if (parsed < 0) return { ok: false, error: `${field} must be a non-negative number` }
  return { ok: true, data: parsed }
}

export function parseNonNegativeFloat(value: string, field: string): ParseResult<number> {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return { ok: false, error: `${field} must be a valid number` }
  if (parsed < 0) return { ok: false, error: `${field} must be a non-negative number` }
  return { ok: true, data: parsed }
}

/**
 * Validates and parses a JSON dimensions string.
 * Expects { length?, width?, height? } as non-negative numbers and unit as mm|cm|in.
 */
export function parseDimensions(raw: string): ParseResult<ModelDimensions> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'Invalid JSON in dimensions' }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'dimensions must be a JSON object' }
  }
  const obj = parsed as Record<string, unknown>
  if (obj.unit !== undefined && (typeof obj.unit !== 'string' || !(ALLOWED_DIMENSION_UNITS as readonly string[]).includes(obj.unit))) {
    return { ok: false, error: 'dimensions.unit must be one of: mm, cm, in' }
  }
  for (const key of ['length', 'width', 'height'] as const) {
    const val = obj[key]
    if (val !== undefined && (typeof val !== 'number' || !Number.isFinite(val) || val < 0)) {
      return { ok: false, error: `dimensions.${key} must be a non-negative finite number` }
    }
  }
  const result: ModelDimensions = {}
  if (obj.length !== undefined) result.length = obj.length as number
  if (obj.width !== undefined) result.width = obj.width as number
  if (obj.height !== undefined) result.height = obj.height as number
  if (obj.unit !== undefined) result.unit = obj.unit as ModelDimensions['unit']
  return { ok: true, data: result }
}

/**
 * Validates and parses a JSON print settings string.
 * Expects { layer_height?, infill?, supports? } with appropriate constraints.
 */
export function parsePrintSettings(raw: string): ParseResult<ModelPrintSettings> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'Invalid JSON in print_settings' }
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'print_settings must be a JSON object' }
  }
  const ps = parsed as Record<string, unknown>
  if (ps.layer_height !== undefined && (typeof ps.layer_height !== 'number' || !Number.isFinite(ps.layer_height) || ps.layer_height < 0)) {
    return { ok: false, error: 'print_settings.layer_height must be a non-negative finite number' }
  }
  if (ps.infill !== undefined && (typeof ps.infill !== 'number' || !Number.isFinite(ps.infill) || ps.infill < 0 || ps.infill > 100)) {
    return { ok: false, error: 'print_settings.infill must be a finite number between 0 and 100' }
  }
  if (ps.supports !== undefined && (typeof ps.supports !== 'string' || !(ALLOWED_SUPPORT_TYPES as readonly string[]).includes(ps.supports))) {
    return { ok: false, error: 'print_settings.supports must be one of: none, buildplate_only, everywhere' }
  }
  const result: ModelPrintSettings = {}
  if (ps.layer_height !== undefined) result.layer_height = ps.layer_height as number
  if (ps.infill !== undefined) result.infill = ps.infill as number
  if (ps.supports !== undefined) result.supports = ps.supports as ModelPrintSettings['supports']
  return { ok: true, data: result }
}

/** Flat metadata form fields, as held by the model-upload form state. */
export interface ModelMetadataFormFields {
  material: string
  color: string
  dimensionsLength: string
  dimensionsWidth: string
  dimensionsHeight: string
  dimensionsUnit: string
  layerHeight: string
  infill: string
  supports: string
  estimatedPrintTime: string
  estimatedMaterialUsage: string
}

/** Wire shape: dimensions/print_settings as JSON strings, estimates as numeric
 *  strings, each '' when unset. Matches what both routes parse. */
export interface SerializedModelMetadata {
  material: string
  color: string
  dimensions: string
  print_settings: string
  estimated_print_time: string
  estimated_material_usage: string
}

/**
 * Serializes the flat metadata form fields into the request-payload shape used
 * by both the public upload flow and the internal curation draft PATCH, so the
 * two never drift. Dimensions and print settings become JSON strings (empty
 * when no sub-field is set); estimates are passed through trimmed.
 */
export function serializeModelMetadata(f: ModelMetadataFormFields): SerializedModelMetadata {
  const dims: Record<string, number | string> = {}
  if (f.dimensionsLength.trim()) dims.length = parseFloat(f.dimensionsLength)
  if (f.dimensionsWidth.trim()) dims.width = parseFloat(f.dimensionsWidth)
  if (f.dimensionsHeight.trim()) dims.height = parseFloat(f.dimensionsHeight)
  const hasDims = Object.keys(dims).length > 0
  if (hasDims) dims.unit = f.dimensionsUnit || 'mm'

  const ps: Record<string, number | string> = {}
  if (f.layerHeight.trim()) ps.layer_height = parseFloat(f.layerHeight)
  if (f.infill.trim()) ps.infill = parseFloat(f.infill)
  if (f.supports.trim()) ps.supports = f.supports

  return {
    material: f.material.trim(),
    color: f.color.trim(),
    dimensions: hasDims ? JSON.stringify(dims) : '',
    print_settings: Object.keys(ps).length > 0 ? JSON.stringify(ps) : '',
    estimated_print_time: f.estimatedPrintTime.trim(),
    estimated_material_usage: f.estimatedMaterialUsage.trim(),
  }
}
