import { z } from 'zod'
import { curatedHostingTypeSchema } from '@/lib/curation/hosting'
import { clearableText, httpUrl, URL_MAX_LENGTH, uuid } from '@/lib/schemas/common'
import { hasFields, partDraftFieldsSchema } from '@/lib/schemas/drafts'
import { curationChecklistSchema, curationCriterionKeySchema, partDraftFields } from '@/lib/schemas/part-fields'
import { isValidHttpUrl } from '@/lib/utils/validation'

/**
 * Request schemas of the elsewhere track: the curation endpoints
 * (`/api/curation/**`) that record a part published on another platform.
 */

const AUTHOR_MAX_LENGTH = 200
const JUSTIFICATION_MAX_LENGTH = 1000
const REJECTION_REASON_MAX_LENGTH = 1000

/** `?url=` of the source-check and prefill lookups. */
export const sourceUrlQuerySchema = z.object({ url: httpUrl })

/** `?productId=` of the demand context lookup. */
export const demandQuerySchema = z.object({ productId: uuid })

const originalAuthor = z.string().trim().min(1, { error: 'required' }).max(AUTHOR_MAX_LENGTH)

/** An optional author profile URL: blank reads as null. */
const originalAuthorUrl = z
  .string()
  .trim()
  .max(URL_MAX_LENGTH)
  .refine((value) => !value || isValidHttpUrl(value), { error: 'httpUrl' })
  .transform((value) => value || null)

/**
 * POST /api/curation/drafts — the source step: the DB minimum of a curated
 * part (title, source URL, original author, license at the source) and, since
 * a part published elsewhere is always referenced (#396), the platform.
 */
export const createCurationDraftSchema = z.object({
  title: partDraftFields.title,
  sourceUrl: httpUrl,
  originalAuthor,
  originalAuthorUrl: originalAuthorUrl.optional().transform((value) => value ?? null),
  licenseId: uuid,
  sourcePlatform: z.string().trim().min(1, { error: 'required' }),
  fileHostingType: curatedHostingTypeSchema.optional(),
})

/**
 * PATCH /api/curation/drafts/[id] — any subset of the editable fields. The
 * cross-field rules (platform matching the source URL, justification of a
 * legal review flag) depend on the stored draft and stay in the route.
 */
export const updateCurationDraftSchema = partDraftFieldsSchema
  .extend({
    // Blank clears the category of a draft.
    categoryId: z
      .string()
      .trim()
      .pipe(z.union([z.literal('').transform(() => null), uuid]))
      .optional(),
    // The license chosen at the source (#374). A curated part cannot be saved
    // without it (curated_requires_source), so it cannot be cleared.
    licenseId: uuid.optional(),
    // Shape only here: platform existence is checked by the route's
    // cross-field rule, which knows the resulting hosting type.
    sourcePlatform: z
      .string()
      .trim()
      .transform((value) => value || null)
      .optional(),
    fileHostingType: curatedHostingTypeSchema.optional(),
    originalAuthor: originalAuthor.optional(),
    originalAuthorUrl: originalAuthorUrl.optional(),
    checklist: curationChecklistSchema.optional(),
    needs_verification: z.boolean().optional(),
    needs_print_settings: z.boolean().optional(),
    needs_photo: z.boolean().optional(),
    needs_instructions: z.boolean().optional(),
    needs_category: z.boolean().optional(),
    needs_legal_review: z.boolean().optional(),
    legalReviewJustification: clearableText(JUSTIFICATION_MAX_LENGTH).optional(),
  })
  .refine(hasFields, { error: 'nothingToUpdate' })

/**
 * POST /api/curation/rejections — rejection traceability (Flow P3 §4.3.3):
 * the source, why it was rejected, and which blocking criteria failed.
 */
export const curationRejectionSchema = z.object({
  sourceUrl: httpUrl,
  reason: z.string().trim().min(1, { error: 'required' }).max(REJECTION_REASON_MAX_LENGTH),
  failedCriteria: z
    .array(curationCriterionKeySchema)
    .default([])
    .transform((criteria) => [...new Set(criteria)]),
})
