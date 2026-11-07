import { z } from 'zod'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'
import { clearableText, uuidList } from '@/lib/schemas/common'
import { COLOR_MAX_LENGTH, DIMENSION_UNITS, MATERIAL_MAX_LENGTH, SUPPORT_TYPES } from '@/lib/utils/part-metadata'

/**
 * Schemas of the part fields shared by the two publish flows: the public
 * upload (`/api/upload/drafts`) and the elsewhere track
 * (`/api/curation/drafts`) validate them identically. The jsonb shapes of
 * `parts.dimensions`, `parts.print_settings` and `parts.curation_checklist`
 * are defined here once; types/database.ts derives their types from them.
 */

const { PART } = VALIDATION_LIMITS


/** A number that is finite (Zod refuses NaN and Infinity) and not negative. */
const nonNegativeNumber = z.number().nonnegative()

/** Shape of parts.dimensions (jsonb). Unknown keys are dropped. */
export const partDimensionsSchema = z.object({
  length: nonNegativeNumber.optional(),
  width: nonNegativeNumber.optional(),
  height: nonNegativeNumber.optional(),
  unit: z.enum(DIMENSION_UNITS).optional(),
})

/** Shape of parts.print_settings (jsonb). Unknown keys are dropped. */
export const partPrintSettingsSchema = z.object({
  layer_height: nonNegativeNumber.optional(),
  infill: nonNegativeNumber.max(100).optional(),
  supports: z.enum(SUPPORT_TYPES).optional(),
})

const criterion = z.boolean().optional()

/**
 * Shape of parts.curation_checklist (jsonb): the six blocking criteria of
 * curation checklist v1 (Flow P3 §4.3.3), each optional. All six must be true
 * for a curated part to be publishable. Unknown keys are dropped.
 */
export const curationChecklistSchema = z.object(
  {
    eligibility: criterion,
    product_target: criterion,
    license: criterion,
    file: criterion,
    attribution: criterion,
    duplicate: criterion,
  },
)

/** The criterion keys of the checklist, as an enum schema. */
export const curationCriterionKeySchema = curationChecklistSchema.keyof()

/**
 * A jsonb column sent as a JSON string, the way serializePartMetadata() emits
 * it: an empty string clears the column (null), anything else must parse and
 * match `schema`. The string form is required rather than coerced, so a
 * malformed payload never silently wipes stored data on a partial autosave.
 */
function jsonColumn<Schema extends z.ZodType>(schema: Schema) {
  return z
    .string()
    .trim()
    .transform((raw, ctx): unknown => {
      if (!raw) return null
      try {
        return JSON.parse(raw)
      } catch {
        ctx.addIssue({ code: 'custom', message: 'invalidJsonValue' })
        return z.NEVER
      }
    })
    .pipe(schema.nullable())
}

/**
 * A number column sent as a numeric string: an empty string clears it (null),
 * anything else must be a non-negative number, and an integer when `integer`
 * is set. Zod's integers are safe (below 2^53), so a bigint column never
 * stores a silently rounded value.
 */
function numericColumn(integer: boolean) {
  const number = integer ? z.number().int() : z.number()
  return z
    .string()
    .trim()
    .transform((raw) => (raw ? Number(raw) : null))
    .pipe(number.nonnegative().nullable())
}

/** Fields both draft PATCH routes accept, each optional (only sent keys are written). */
export const partDraftFields = {
  title: z.string().trim().min(PART.TITLE_MIN_LENGTH).max(PART.TITLE_MAX_LENGTH),
  description: clearableText(PART.DESCRIPTION_MAX_LENGTH),
  instructions: clearableText(PART.INSTRUCTIONS_MAX_LENGTH),
  // Blank tags are dropped before the limits apply, as the form may send them.
  tags: z
    .array(z.string())
    .transform((tags) => tags.map((tag) => tag.trim()).filter(Boolean))
    .pipe(z.array(z.string().min(PART.TAG_MIN_LENGTH).max(PART.TAG_MAX_LENGTH)).max(PART.TAGS_MAX_COUNT)),
  material: clearableText(MATERIAL_MAX_LENGTH),
  color: clearableText(COLOR_MAX_LENGTH),
  dimensions: jsonColumn(partDimensionsSchema),
  print_settings: jsonColumn(partPrintSettingsSchema),
  estimated_print_time: numericColumn(true),
  estimated_material_usage: numericColumn(false),
  productIds: uuidList(PART.PRODUCTS_MAX_COUNT),
}
