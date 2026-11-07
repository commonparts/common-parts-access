/**
 * A part's physical and print metadata on the form side: the column limits
 * and the serializer that turns the flat form fields into the request
 * payload. The routes validate that payload with the schemas of
 * lib/schemas/part-fields.ts.
 */

// Column length limits mirrored from the parts table CHECK constraints.
export const MATERIAL_MAX_LENGTH = 100
export const COLOR_MAX_LENGTH = 50

/** Values of parts.dimensions.unit and parts.print_settings.supports. */
export const DIMENSION_UNITS = ['mm', 'cm', 'in'] as const
export const SUPPORT_TYPES = ['none', 'buildplate_only', 'everywhere'] as const

/** Flat metadata form fields, as held by the part-upload form state. */
export interface PartMetadataFormFields {
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
export interface SerializedPartMetadata {
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
export function serializePartMetadata(f: PartMetadataFormFields): SerializedPartMetadata {
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
