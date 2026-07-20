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
  if (!Number.isInteger(parsed)) return { ok: false, error: `${field} must be a valid integer` }
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
