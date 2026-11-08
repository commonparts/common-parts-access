import { z } from 'zod'
import type { Locale } from 'next-intl'
import { curationChecklistSchema } from '@/lib/schemas/part-fields'
import { savePublicationSchema } from '@/lib/schemas/publish'
import { CURATION_FLAGS } from '@/lib/curation/checklist'
import { CURATED_FILE_HOSTING_TYPE } from '@/lib/curation/hosting'
import { FLAG_STEP } from '@/lib/publish/placement'
import { PUBLISH_STEPS, type PublishStepIndex } from '@/lib/publish/steps'
import type { PublishTrack } from '@/lib/publish/tracks'
import { serializePartMetadata } from '@/lib/utils/part-metadata'
import { validationErrorMap, validationMessage } from '@/lib/utils/validation-messages'

/** UI values stay strings until the shared payload schema parses them. */
const publishFormValuesSchema = z.object({
  title: z.string(), description: z.string(), instructions: z.string(),
  categoryId: z.string(), licenseId: z.string(), brandId: z.string(),
  tags: z.array(z.string()), productIds: z.array(z.string()),
  files: z.array(z.custom<File>()), thumbnails: z.array(z.custom<File>()),
  sourceUrl: z.string(), sourcePlatform: z.string(), originalAuthor: z.string(), originalAuthorUrl: z.string(),
  material: z.string(), color: z.string(),
  dimensionsLength: z.string(), dimensionsWidth: z.string(), dimensionsHeight: z.string(), dimensionsUnit: z.string(),
  layerHeight: z.string(), infill: z.string(), supports: z.string(),
  estimatedPrintTime: z.string(), estimatedMaterialUsage: z.string(),
  attested: z.boolean(), checklist: curationChecklistSchema,
  confirmedFlags: z.object({
    needs_category: z.boolean(), needs_photo: z.boolean(), needs_print_settings: z.boolean(),
    needs_instructions: z.boolean(), needs_verification: z.boolean(),
  }),
  needsLegalReview: z.boolean(), legalJustification: z.string(),
})

export type PublishFormValues = z.output<typeof publishFormValuesSchema>

export const EMPTY_PUBLISH_FORM: PublishFormValues = {
  title: '', description: '', instructions: '', categoryId: '', licenseId: '', brandId: '',
  tags: [], productIds: [], files: [], thumbnails: [],
  sourceUrl: '', sourcePlatform: '', originalAuthor: '', originalAuthorUrl: '',
  material: '', color: '', dimensionsLength: '', dimensionsWidth: '', dimensionsHeight: '', dimensionsUnit: 'mm',
  layerHeight: '', infill: '', supports: '', estimatedPrintTime: '', estimatedMaterialUsage: '',
  attested: false, checklist: {},
  confirmedFlags: { needs_category: false, needs_photo: false, needs_print_settings: false, needs_instructions: false, needs_verification: false },
  needsLegalReview: false, legalJustification: '',
}

export interface PublishFormContext {
  track: PublishTrack
  step: PublishStepIndex
  draftId: string | null
}

/** Adapts the shared wire schema's errors to the form's flat input names. */
export function publishFormSchema(
  context: PublishFormContext,
  locale: Locale,
  validation: Parameters<typeof validationMessage>[1],
  fields: Parameters<typeof validationMessage>[2],
): typeof publishFormValuesSchema {
  const inputNames: Record<string, string> = {
    'dimensions.length': 'dimensionsLength', 'dimensions.width': 'dimensionsWidth',
    'dimensions.height': 'dimensionsHeight', 'dimensions.unit': 'dimensionsUnit',
    'print_settings.layer_height': 'layerHeight', 'print_settings.infill': 'infill',
    'print_settings.supports': 'supports', estimated_print_time: 'estimatedPrintTime',
    estimated_material_usage: 'estimatedMaterialUsage',
  }
  return publishFormValuesSchema.superRefine((values, ctx) => {
    const payload = draftSubmission(values, context)
    if (!payload) return
    const result = savePublicationSchema.safeParse(payload, { error: validationErrorMap(locale) })
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path.filter((segment) => segment !== 'fields')
        ctx.addIssue({ code: 'custom', path: inputNames[path.join('.')] ? [inputNames[path.join('.')]] : path,
          message: validationMessage(issue, validation, fields) })
      }
    }
  })
}

/** Saves only the current step, so incomplete later steps never block a draft. */
export function draftSubmission(
  values: PublishFormValues,
  { track, step, draftId }: PublishFormContext,
): z.input<typeof savePublicationSchema> | null {
  const { title, categoryId, licenseId, sourceUrl, sourcePlatform, originalAuthor, originalAuthorUrl, checklist } = values
  if (step === PUBLISH_STEPS.ORIGIN && !draftId) {
    return track === 'original'
      ? { operation: 'createOriginal', fields: { title, categoryId, licenseId, attested: values.attested } }
      : { operation: 'createElsewhere', fields: { title, sourceUrl, sourcePlatform, originalAuthor, originalAuthorUrl, licenseId, fileHostingType: CURATED_FILE_HOSTING_TYPE } }
  }
  if (!draftId) return null
  const flags = Object.fromEntries(CURATION_FLAGS.filter((column) => FLAG_STEP[column] === step)
    .map((column) => [column, !values.confirmedFlags[column]]))
  const details = {
    description: values.description, instructions: values.instructions, tags: values.tags,
    ...serializePartMetadata(values),
  }
  if (track === 'original') {
    if (step === PUBLISH_STEPS.FILES || step === PUBLISH_STEPS.REVIEW) return null
    return { operation: 'updateOriginal', id: draftId, fields:
      step === PUBLISH_STEPS.ORIGIN ? { title, categoryId, licenseId }
        : step === PUBLISH_STEPS.DETAILS ? details : { productIds: values.productIds } }
  }
  const fields = step === PUBLISH_STEPS.ORIGIN
    ? { title, categoryId, licenseId, sourcePlatform, originalAuthor, originalAuthorUrl, fileHostingType: CURATED_FILE_HOSTING_TYPE, checklist, ...flags }
    : step === PUBLISH_STEPS.FILES ? { checklist, ...flags }
      : step === PUBLISH_STEPS.DETAILS ? { ...details, ...flags }
        : step === PUBLISH_STEPS.COMPATIBILITY ? { productIds: values.productIds, checklist }
          : { ...flags, needs_legal_review: values.needsLegalReview, legalReviewJustification: values.legalJustification }
  return { operation: 'updateElsewhere', id: draftId, fields }
}
