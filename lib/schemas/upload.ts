import { z } from 'zod'
import { uuid } from '@/lib/schemas/common'
import { partDraftFields } from '@/lib/schemas/part-fields'
import { hasFields, NOTHING_TO_UPDATE, partDraftFieldsSchema } from '@/lib/schemas/drafts'
import { findForbiddenField, forbiddenFieldError } from '@/lib/upload/payload'

/**
 * Request schemas of the public upload flow (`/api/upload/drafts`, issue
 * #293). Both refuse a body carrying a field the flow does not let the
 * contributor set (origin, hosting mode, verification, source attribution),
 * naming it, before any other check: see lib/upload/payload.ts.
 */

const INVALID_BODY = 'Invalid request body'

/** Wraps `schema` with the refusal of the fields the upload flow does not expose. */
function refusingForbiddenFields<Schema extends z.ZodObject>(schema: Schema) {
  return z
    .record(z.string(), z.unknown(), { error: INVALID_BODY })
    .superRefine((payload, ctx) => {
      const field = findForbiddenField(payload)
      if (field) ctx.addIssue({ code: 'custom', message: forbiddenFieldError(field) })
    })
    .pipe(schema)
}

/** POST /api/upload/drafts — the first step: title, category, license, declaration. */
export const createUploadDraftSchema = refusingForbiddenFields(
  z.object({
    title: partDraftFields.title,
    // An explicit true: a missing or truthy-ish value is not someone claiming
    // authorship of a design.
    attested: z.literal(true, { error: 'The originality declaration must be confirmed to start an upload' }),
    categoryId: uuid('A category is required'),
    licenseId: uuid('A license is required'),
  }),
)

/**
 * PATCH /api/upload/drafts/[id] — any subset of the editable fields. Category
 * and license are set at creation and stay required: unlike the curation
 * draft, neither can be cleared back to null.
 */
export const updateUploadDraftSchema = refusingForbiddenFields(
  partDraftFieldsSchema
    .extend({
      categoryId: uuid('A category is required').optional(),
      licenseId: uuid('A license is required').optional(),
    })
    .refine(hasFields, { error: NOTHING_TO_UPDATE }),
)
