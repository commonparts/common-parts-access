import { z } from 'zod'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'
import { clearableText, uuidList } from '@/lib/schemas/common'
import { COLOR_MAX_LENGTH, MATERIAL_MAX_LENGTH } from '@/lib/utils/part-metadata'

/**
 * Schemas of the part fields shared by the two publish flows: the public
 * upload (`/api/upload/drafts`) and the elsewhere track
 * (`/api/curation/drafts`) validate them identically. The jsonb shapes of
 * `parts.dimensions`, `parts.print_settings` and `parts.curation_checklist`
 * are defined here once; types/database.ts derives their types from them.
 */

const { PART } = VALIDATION_LIMITS

const DIMENSION_UNITS = ['mm', 'cm', 'in'] as const
const SUPPORT_TYPES = ['none', 'buildplate_only', 'everywhere'] as const

/** A number that is finite (Zod refuses NaN and Infinity) and not negative. */
function nonNegativeNumber(message: string) {
  return z.number({ error: message }).nonnegative({ error: message })
}

/** Shape of parts.dimensions (jsonb). Unknown keys are dropped. */
export const partDimensionsSchema = z.object(
  {
    length: nonNegativeNumber('dimensions.length must be a non-negative finite number').optional(),
    width: nonNegativeNumber('dimensions.width must be a non-negative finite number').optional(),
    height: nonNegativeNumber('dimensions.height must be a non-negative finite number').optional(),
    unit: z.enum(DIMENSION_UNITS, { error: 'dimensions.unit must be one of: mm, cm, in' }).optional(),
  },
  { error: 'dimensions must be a JSON object' },
)

/** Shape of parts.print_settings (jsonb). Unknown keys are dropped. */
export const partPrintSettingsSchema = z.object(
  {
    layer_height: nonNegativeNumber('print_settings.layer_height must be a non-negative finite number').optional(),
    infill: nonNegativeNumber('print_settings.infill must be a finite number between 0 and 100')
      .max(100, { error: 'print_settings.infill must be a finite number between 0 and 100' })
      .optional(),
    supports: z
      .enum(SUPPORT_TYPES, { error: 'print_settings.supports must be one of: none, buildplate_only, everywhere' })
      .optional(),
  },
  { error: 'print_settings must be a JSON object' },
)

const CHECKLIST_MESSAGE = 'Checklist must be an object of criterion booleans'
const criterion = z.boolean({ error: CHECKLIST_MESSAGE }).optional()

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
  { error: CHECKLIST_MESSAGE },
)

/** The criterion keys of the checklist, as an enum schema. */
export const curationCriterionKeySchema = curationChecklistSchema.keyof()

/**
 * A jsonb column sent as a JSON string, the way serializePartMetadata() emits
 * it: an empty string clears the column (null), anything else must parse and
 * match `schema`. The string form is required rather than coerced, so a
 * malformed payload never silently wipes stored data on a partial autosave.
 */
function jsonColumn<Schema extends z.ZodType>(name: string, schema: Schema) {
  return z
    .string({ error: `${name} must be a JSON string` })
    .trim()
    .transform((raw, ctx): z.output<Schema> | null => {
      if (!raw) return null
      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        ctx.addIssue({ code: 'custom', message: `Invalid JSON in ${name}` })
        return z.NEVER
      }
      const result = schema.safeParse(parsed)
      if (!result.success) {
        ctx.addIssue({ code: 'custom', message: result.error.issues[0]?.message ?? `Invalid ${name}` })
        return z.NEVER
      }
      return result.data
    })
}

/**
 * A number column sent as a numeric string: an empty string clears it (null),
 * anything else must be a non-negative number, and an integer when `integer`
 * is set. Integers must be safe (below 2^53) so a bigint column never stores a
 * silently rounded value.
 */
function numericColumn(name: string, integer: boolean) {
  return z
    .string({ error: `${name} must be a string` })
    .trim()
    .transform((raw, ctx): number | null => {
      if (!raw) return null
      const parsed = Number(raw)
      const valid = integer ? Number.isSafeInteger(parsed) : Number.isFinite(parsed)
      if (!valid) {
        ctx.addIssue({ code: 'custom', message: `${name} must be a valid ${integer ? 'integer' : 'number'}` })
        return z.NEVER
      }
      if (parsed < 0) {
        ctx.addIssue({ code: 'custom', message: `${name} must be a non-negative number` })
        return z.NEVER
      }
      return parsed
    })
}

const TITLE_MESSAGE = `Title must be between ${PART.TITLE_MIN_LENGTH} and ${PART.TITLE_MAX_LENGTH} characters`
const TAG_MESSAGE = `Tags must be between ${PART.TAG_MIN_LENGTH} and ${PART.TAG_MAX_LENGTH} characters`

/** Fields both draft PATCH routes accept, each optional (only sent keys are written). */
export const partDraftFields = {
  title: z
    .string({ error: TITLE_MESSAGE })
    .trim()
    .min(PART.TITLE_MIN_LENGTH, { error: TITLE_MESSAGE })
    .max(PART.TITLE_MAX_LENGTH, { error: TITLE_MESSAGE }),
  description: clearableText(PART.DESCRIPTION_MAX_LENGTH, {
    type: 'Description must be a string',
    tooLong: `Description must be at most ${PART.DESCRIPTION_MAX_LENGTH} characters`,
  }),
  instructions: clearableText(PART.INSTRUCTIONS_MAX_LENGTH, {
    type: 'Instructions must be a string',
    tooLong: `Instructions must be at most ${PART.INSTRUCTIONS_MAX_LENGTH} characters`,
  }),
  // Blank tags are dropped before the limits apply, as the form may send them.
  tags: z
    .array(z.string({ error: 'Tags must be an array of strings' }), { error: 'Tags must be an array' })
    .transform((tags) => tags.map((tag) => tag.trim()).filter(Boolean))
    .pipe(
      z
        .array(
          z
            .string()
            .min(PART.TAG_MIN_LENGTH, { error: TAG_MESSAGE })
            .max(PART.TAG_MAX_LENGTH, { error: TAG_MESSAGE }),
        )
        .max(PART.TAGS_MAX_COUNT, { error: `Too many tags (max ${PART.TAGS_MAX_COUNT})` }),
    ),
  material: clearableText(MATERIAL_MAX_LENGTH, {
    type: 'Material must be a string',
    tooLong: `Material is too long (max ${MATERIAL_MAX_LENGTH} characters)`,
  }),
  color: clearableText(COLOR_MAX_LENGTH, {
    type: 'Color must be a string',
    tooLong: `Color is too long (max ${COLOR_MAX_LENGTH} characters)`,
  }),
  dimensions: jsonColumn('dimensions', partDimensionsSchema),
  print_settings: jsonColumn('print_settings', partPrintSettingsSchema),
  estimated_print_time: numericColumn('estimated_print_time', true),
  estimated_material_usage: numericColumn('estimated_material_usage', false),
  productIds: uuidList(PART.PRODUCTS_MAX_COUNT, {
    invalid: 'productIds must be unique product UUIDs',
    tooMany: `Too many products (max ${PART.PRODUCTS_MAX_COUNT})`,
  }),
}
