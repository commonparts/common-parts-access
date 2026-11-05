import { z } from 'zod'
import { partDraftFields } from '@/lib/schemas/part-fields'
import type { Part } from '@/types/database'

/**
 * The part fields both draft PATCH routes accept, each optional: only the keys
 * a request sends are written.
 */
export const partDraftFieldsSchema = z.object(partDraftFields).partial()

type PartDraftFieldsInput = z.output<typeof partDraftFieldsSchema>

/** Column-shaped patch of the shared draft fields; only defined keys are written. */
export type PartDraftColumns = Partial<
  Pick<
    Part,
    | 'name'
    | 'description'
    | 'instructions'
    | 'tags'
    | 'material'
    | 'color'
    | 'dimensions'
    | 'print_settings'
    | 'estimated_print_time'
    | 'estimated_material_usage'
  >
>

/**
 * Maps the validated shared fields of a draft PATCH to their `parts` columns,
 * keeping only the keys the request sent. `productIds` is not a column: the
 * routes sync it to part_products separately.
 */
export function toPartDraftColumns(input: PartDraftFieldsInput): PartDraftColumns {
  const columns: PartDraftColumns = {}
  if (input.title !== undefined) columns.name = input.title
  if (input.description !== undefined) columns.description = input.description
  if (input.instructions !== undefined) columns.instructions = input.instructions
  if (input.tags !== undefined) columns.tags = input.tags
  if (input.material !== undefined) columns.material = input.material
  if (input.color !== undefined) columns.color = input.color
  if (input.dimensions !== undefined) columns.dimensions = input.dimensions
  if (input.print_settings !== undefined) columns.print_settings = input.print_settings
  if (input.estimated_print_time !== undefined) columns.estimated_print_time = input.estimated_print_time
  if (input.estimated_material_usage !== undefined) columns.estimated_material_usage = input.estimated_material_usage
  return columns
}

/** Refusal of a PATCH that sends no field the route knows. */
export const NOTHING_TO_UPDATE = 'Nothing to update'

/** Whether a parsed PATCH body carries at least one field. */
export function hasFields(input: object): boolean {
  return Object.keys(input).length > 0
}
