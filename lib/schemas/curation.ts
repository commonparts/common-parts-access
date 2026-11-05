import { z } from 'zod'
import { curatedHostingTypeSchema } from '@/lib/curation/hosting'
import { clearableText, httpUrl, URL_MAX_LENGTH, uuid } from '@/lib/schemas/common'
import { hasFields, NOTHING_TO_UPDATE, partDraftFieldsSchema } from '@/lib/schemas/drafts'
import { curationChecklistSchema, curationCriterionKeySchema, partDraftFields } from '@/lib/schemas/part-fields'
import { isValidHttpUrl } from '@/lib/utils/validation'

/**
 * Request schemas of the elsewhere track: the curation endpoints
 * (`/api/curation/**`) that record a part published on another platform.
 */

const AUTHOR_MAX_LENGTH = 200
const JUSTIFICATION_MAX_LENGTH = 1000
const REJECTION_REASON_MAX_LENGTH = 1000

const SOURCE_URL_MESSAGE = 'A valid http(s) source URL is required'
const AUTHOR_MESSAGE = `Original author is required (max ${AUTHOR_MAX_LENGTH} characters)`
const AUTHOR_URL_MESSAGE = 'Original author URL must be a valid http(s) URL'
const PLATFORM_REQUIRED_MESSAGE = 'A source platform is required for a part published elsewhere'

/** `?url=` of the source-check and prefill lookups. */
export const sourceUrlQuerySchema = z.object({ url: httpUrl(SOURCE_URL_MESSAGE) })

/** `?productId=` of the demand context lookup. */
export const demandQuerySchema = z.object({ productId: uuid('A valid productId is required') })

const originalAuthor = z
  .string({ error: AUTHOR_MESSAGE })
  .trim()
  .min(1, { error: AUTHOR_MESSAGE })
  .max(AUTHOR_MAX_LENGTH, { error: AUTHOR_MESSAGE })

/** An optional author profile URL: blank reads as null. */
const originalAuthorUrl = z
  .string({ error: AUTHOR_URL_MESSAGE })
  .trim()
  .max(URL_MAX_LENGTH, { error: AUTHOR_URL_MESSAGE })
  .refine((value) => !value || isValidHttpUrl(value), { error: AUTHOR_URL_MESSAGE })
  .transform((value) => value || null)

/**
 * POST /api/curation/drafts — the source step: the DB minimum of a curated
 * part (title, source URL, original author, license at the source) and, since
 * a part published elsewhere is always referenced (#396), the platform.
 */
export const createCurationDraftSchema = z.object({
  title: partDraftFields.title,
  sourceUrl: httpUrl(SOURCE_URL_MESSAGE),
  originalAuthor,
  originalAuthorUrl: originalAuthorUrl.optional().transform((value) => value ?? null),
  licenseId: uuid('The license at the source is required'),
  sourcePlatform: z
    .string({ error: PLATFORM_REQUIRED_MESSAGE })
    .trim()
    .min(1, { error: PLATFORM_REQUIRED_MESSAGE }),
  fileHostingType: curatedHostingTypeSchema.optional(),
})

function curationFlag(column: string) {
  return z.boolean({ error: `${column} must be a boolean` })
}

/**
 * PATCH /api/curation/drafts/[id] — any subset of the editable fields. The
 * cross-field rules (platform matching the source URL, justification of a
 * legal review flag) depend on the stored draft and stay in the route.
 */
export const updateCurationDraftSchema = partDraftFieldsSchema
  .extend({
    // Blank clears the category of a draft.
    categoryId: z
      .string({ error: 'Invalid category' })
      .trim()
      .pipe(z.union([z.literal('').transform(() => null), uuid('Invalid category')]))
      .optional(),
    // The license chosen at the source (#374). A curated part cannot be saved
    // without it (curated_requires_source), so it cannot be cleared.
    licenseId: uuid('The license at the source is required for a part published elsewhere').optional(),
    // Shape only here: platform existence is checked by the route's
    // cross-field rule, which knows the resulting hosting type.
    sourcePlatform: z
      .string({ error: 'Source platform must be a string' })
      .trim()
      .transform((value) => value || null)
      .optional(),
    fileHostingType: curatedHostingTypeSchema.optional(),
    originalAuthor: originalAuthor.optional(),
    originalAuthorUrl: originalAuthorUrl.optional(),
    checklist: curationChecklistSchema.optional(),
    needs_verification: curationFlag('needs_verification').optional(),
    needs_print_settings: curationFlag('needs_print_settings').optional(),
    needs_photo: curationFlag('needs_photo').optional(),
    needs_instructions: curationFlag('needs_instructions').optional(),
    needs_category: curationFlag('needs_category').optional(),
    needs_legal_review: curationFlag('needs_legal_review').optional(),
    legalReviewJustification: clearableText(JUSTIFICATION_MAX_LENGTH, {
      type: 'Justification must be a string',
      tooLong: `Justification must be at most ${JUSTIFICATION_MAX_LENGTH} characters`,
    }).optional(),
  })
  .refine(hasFields, { error: NOTHING_TO_UPDATE })

const REASON_MESSAGE = `A rejection reason is required (max ${REJECTION_REASON_MAX_LENGTH} characters)`

/**
 * POST /api/curation/rejections — rejection traceability (Flow P3 §4.3.3):
 * the source, why it was rejected, and which blocking criteria failed.
 */
export const curationRejectionSchema = z.object({
  sourceUrl: httpUrl(SOURCE_URL_MESSAGE),
  reason: z
    .string({ error: REASON_MESSAGE })
    .trim()
    .min(1, { error: REASON_MESSAGE })
    .max(REJECTION_REASON_MAX_LENGTH, { error: REASON_MESSAGE }),
  failedCriteria: z
    .array(curationCriterionKeySchema, { error: 'failedCriteria must be a list of checklist criteria' })
    .default([])
    .transform((criteria) => [...new Set(criteria)]),
})
