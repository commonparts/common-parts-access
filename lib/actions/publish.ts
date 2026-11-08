'use server'

import { getTranslations } from 'next-intl/server'
import type { z } from 'zod'
import { validate } from '@/lib/api/parse'
import { savePublicationSchema, publishPublicationSchema } from '@/lib/schemas/publish'
import { createClient } from '@/lib/supabase/server'
import { createUploadDraft, getUploadDraft, updateUploadDraft, type UploadDraftPatch } from '@/lib/supabase/queries/upload'
import { createCurationDraft, findPartBySourceUrl, getCurationDraft, updateCurationDraft, type CurationDraftPatch } from '@/lib/supabase/queries/curation'
import { getLicenseById } from '@/lib/supabase/queries/licenses'
import { getSourcePlatformBySlug, validateSourceUrlMatchesPlatform } from '@/lib/supabase/queries/platforms'
import { findProductLinkBlocker } from '@/lib/supabase/queries/products'
import { publishDraftPart, isDraftCategoryValid, areDraftProductsValid } from '@/lib/supabase/queries/publish'
import { toPartDraftColumns } from '@/lib/schemas/drafts'
import { isHostableLicenseRow } from '@/lib/utils/licenses'
import { hasErrorCode } from '@/lib/utils/errors'
import { isChecklistComplete, missingCriteria } from '@/lib/curation/checklist'
import { CURATED_FILE_HOSTING_TYPE } from '@/lib/curation/hosting'
import type { SavePublicationResult, PublishPublicationResult } from '@/lib/publish/results'

const UNIQUE_VIOLATION = '23505'
type Submission = z.output<typeof savePublicationSchema>
type Translations = Awaited<ReturnType<typeof getTranslations<'Api'>>>

/** Validates a step's payload before authenticating and persisting its draft. */
export async function savePublication(input: z.input<typeof savePublicationSchema>): Promise<SavePublicationResult> {
  const parsed = await validate(savePublicationSchema, input)
  if (!parsed.ok) return parsed
  const t = await getTranslations('Api')
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: t('signInRequired') }
    const submission = parsed.data
    switch (submission.operation) {
      case 'createOriginal': return await createOriginal(submission, user.id, t)
      case 'createElsewhere': return await createElsewhere(submission, user.id, t)
      case 'updateOriginal': return await updateOriginal(submission, user.id, t)
      case 'updateElsewhere': return await updateElsewhere(submission, user.id, t)
    }
  } catch (error) {
    console.error('Failed to save publication draft', error)
    return { ok: false, error: t('serverError') }
  }
}

/** Rechecks the stored draft's publication gate; client state never grants publication. */
export async function publishPublication(input: z.input<typeof publishPublicationSchema>): Promise<PublishPublicationResult> {
  const parsed = await validate(publishPublicationSchema, input)
  if (!parsed.ok) return parsed
  const t = await getTranslations('Api')
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: t('signInRequired') }
    return parsed.data.track === 'original'
      ? await publishOriginal(parsed.data.id, user.id, t)
      : await publishElsewhere(parsed.data.id, user.id, t)
  } catch (error) {
    console.error('Failed to publish draft', error)
    return { ok: false, error: t('serverError') }
  }
}

/** Preserves the upload flow's create checks. */
async function createOriginal(submission: Extract<Submission, { operation: 'createOriginal' }>, userId: string, t: Translations): Promise<SavePublicationResult> {
  // The flow's narrowing (fields the contributor may not set, the explicit
  // originality declaration) is enforced by the schema, not in the form.
  const { title: name, categoryId, licenseId } = submission.fields

  if (!(await isDraftCategoryValid(categoryId))) {
    return { ok: false, error: t('invalidCategory') }
  }

  const license = await getLicenseById(licenseId)
  if (!license) {
    return { ok: false, error: t('invalidLicense') }
  }
  // The upload flow only hosts files, so the whitelist applies with no
  // link-out escape hatch: NC/ND parts cannot be published through it.
  if (!isHostableLicenseRow(license)) {
    return { ok: false, error: t('hostingLicense') }
  }

  const draft = await createUploadDraft(userId, { name, categoryId, licenseId })
  return { ok: true, data: { id: draft.id, slug: draft.slug } }
}

/** Preserves the upload flow's update checks. */
async function updateOriginal(submission: Extract<Submission, { operation: 'updateOriginal' }>, userId: string, t: Translations): Promise<SavePublicationResult> {
  const { id } = submission
  const draft = await getUploadDraft(id)
  if (!draft || draft.user_id !== userId) return { ok: false, error: t('draftNotFound') }
  if (draft.status !== 'draft') {
    return { ok: false, error: t('onlyDraftsEditable') }
  }

  // Unknown keys are ignored; the fields the upload flow does not expose are
  // refused by name (see lib/schemas/upload.ts).
  const { categoryId, licenseId, productIds, ...fields } = submission.fields

  const patch: UploadDraftPatch = toPartDraftColumns(fields)

  if (categoryId !== undefined) {
    if (!(await isDraftCategoryValid(categoryId))) return { ok: false, error: t('invalidCategory') }
    patch.category_id = categoryId
  }

  if (licenseId !== undefined) {
    const license = await getLicenseById(licenseId)
    if (!license) return { ok: false, error: t('invalidLicense') }
    if (!isHostableLicenseRow(license)) {
      return { ok: false, error: t('hostingLicense') }
    }
    patch.license_id = licenseId
  }

  if (productIds !== undefined && productIds.length > 0) {
    if (!(await areDraftProductsValid(productIds))) {
      return { ok: false, error: t('invalidProducts') }
    }
  }

  await updateUploadDraft(id, userId, patch, productIds)
  return { ok: true, data: null }
}

/** Preserves the upload flow's publish checks. */
async function publishOriginal(id: string, userId: string, t: Translations): Promise<PublishPublicationResult> {
  const draft = await getUploadDraft(id)
  if (!draft || draft.user_id !== userId) {
    return { ok: false, error: t('draftNotFound') }
  }
  if (draft.status !== 'draft') {
    return { ok: false, error: t('alreadyPublished') }
  }

  const blockers: string[] = []

  if (!draft.name?.trim()) {
    blockers.push(t('blockers.title'))
  }

  if (!draft.category_id) {
    blockers.push(t('blockers.category'))
  }

  if (!draft.originality_attested) {
    blockers.push(t('blockers.attestation'))
  }

  if (!draft.license_id) {
    blockers.push(t('blockers.license'))
  } else {
    const license = await getLicenseById(draft.license_id)
    if (!license) {
      blockers.push(t('blockers.licenseUnverified'))
    } else if (!isHostableLicenseRow(license)) {
      blockers.push(t('hostingLicense'))
    }
  }

  if (draft.model_file_count < 1) {
    blockers.push(t('blockers.modelFile'))
  }

  if (draft.product_ids.length < 1) {
    blockers.push(t('blockers.product'))
  } else {
    const linkBlocker = await findProductLinkBlocker(draft.product_ids)
    if (linkBlocker) blockers.push(t(`blockers.${linkBlocker}`))
  }

  if (blockers.length > 0) {
    return { ok: false, error: t('publicationBlocked'), blockers }
  }

  const published = await publishDraftPart(id, userId)
  if (!published) {
    return { ok: false, error: t('alreadyPublished') }
  }
  return { ok: true, data: { slug: draft.slug } }
}

/** Preserves the curation flow's create checks. */
async function createElsewhere(submission: Extract<Submission, { operation: 'createElsewhere' }>, userId: string, t: Translations): Promise<SavePublicationResult> {
  // The files stay at the source, so the source platform claim is mandatory
  // and must match where the URL actually points (checked below).
  const { title: name, sourceUrl, originalAuthor, originalAuthorUrl, licenseId, sourcePlatform } = submission.fields

  const license = await getLicenseById(licenseId)
  if (!license) {
    return { ok: false, error: t('invalidLicense') }
  }

  // Single round trip: the helper covers both platform existence and the
  // URL domain match.
  const platformCheck = await validateSourceUrlMatchesPlatform(sourcePlatform, sourceUrl)
  if (!platformCheck.ok) {
    return { ok: false, error: t(platformCheck.error) }
  }

  const duplicate = await findPartBySourceUrl(sourceUrl)
  if (duplicate) {
    return { ok: false, error: t('sourceInRegistry'), duplicate }
  }

  try {
    const draft = await createCurationDraft(userId, {
      name,
      sourceUrl,
      originalAuthor,
      licenseId,
      sourcePlatform,
      originalAuthorUrl,
    })
    return { ok: true, data: { id: draft.id, slug: draft.slug } }
  } catch (insertError) {
    // The pre-check cannot see other users' drafts; the unique index can.
    if (hasErrorCode(insertError, UNIQUE_VIOLATION)) {
      return { ok: false, error: t('sourceClaimed'), duplicate: null }
    }
    throw insertError
  }
}

/** Preserves the curation flow's update checks. */
async function updateElsewhere(submission: Extract<Submission, { operation: 'updateElsewhere' }>, userId: string, t: Translations): Promise<SavePublicationResult> {
  const { id } = submission
  const draft = await getCurationDraft(id)
  if (!draft || draft.user_id !== userId) return { ok: false, error: t('draftNotFound') }
  if (draft.status !== 'draft') {
    return { ok: false, error: t('onlyDraftsEditable') }
  }

  const {
    categoryId,
    licenseId,
    sourcePlatform,
    fileHostingType,
    originalAuthor,
    originalAuthorUrl,
    checklist,
    legalReviewJustification,
    needs_verification,
    needs_print_settings,
    needs_photo,
    needs_instructions,
    needs_category,
    needs_legal_review,
    productIds,
    ...fields
  } = submission.fields

  const patch: CurationDraftPatch = {
    ...toPartDraftColumns(fields),
    ...(sourcePlatform !== undefined && { source_platform: sourcePlatform }),
    ...(originalAuthor !== undefined && { original_author: originalAuthor }),
    ...(originalAuthorUrl !== undefined && { original_author_url: originalAuthorUrl }),
    ...(checklist !== undefined && { curation_checklist: checklist }),
    ...(needs_verification !== undefined && { needs_verification }),
    ...(needs_print_settings !== undefined && { needs_print_settings }),
    ...(needs_photo !== undefined && { needs_photo }),
    ...(needs_instructions !== undefined && { needs_instructions }),
    ...(needs_category !== undefined && { needs_category }),
    ...(needs_legal_review !== undefined && { needs_legal_review }),
    ...(legalReviewJustification !== undefined && { legal_review_justification: legalReviewJustification }),
  }

  if (categoryId !== undefined) {
    if (categoryId) {
      if (!(await isDraftCategoryValid(categoryId))) return { ok: false, error: t('invalidCategory') }
    }
    patch.category_id = categoryId
  }

  if (licenseId !== undefined) {
    const license = await getLicenseById(licenseId)
    if (!license) return { ok: false, error: t('invalidLicense') }
    patch.license_id = licenseId
  }

  if (fileHostingType !== undefined) {
    // A part published elsewhere is always referenced (#396): the schema
    // only lets link_out through, which also moves a draft created before
    // the rule to it. Files already registered in storage contradict
    // link-out (the whole point is NOT hosting them).
    if (draft.model_file_count > 0) {
      return { ok: false, error: t('curatedHasModelFiles') }
    }
    patch.file_hosting_type = fileHostingType
  }

  // Cross-field invariant: the resulting state of a link-out draft must name
  // a source platform whose domain matches the (immutable) source URL. This
  // is also the single place platform existence is checked (one round trip).
  const nextHostingType = patch.file_hosting_type ?? draft.file_hosting_type ?? CURATED_FILE_HOSTING_TYPE
  const nextPlatform = patch.source_platform !== undefined ? patch.source_platform : draft.source_platform ?? null
  if (nextHostingType === 'link_out') {
    if (!nextPlatform) {
      return { ok: false, error: t('sourcePlatformRequired') }
    }
    const platformCheck = await validateSourceUrlMatchesPlatform(nextPlatform, draft.source_url ?? '')
    if (!platformCheck.ok) {
      return { ok: false, error: t(platformCheck.error) }
    }
  } else if (patch.source_platform) {
    if (!(await getSourcePlatformBySlug(patch.source_platform))) return { ok: false, error: t('unknownSourcePlatform') }
  }

  // The DB constraint also enforces this pair; failing early gives a clean 400.
  const nextNeedsLegalReview = patch.needs_legal_review ?? draft.needs_legal_review ?? false
  const nextJustification = patch.legal_review_justification !== undefined
    ? patch.legal_review_justification
    : draft.legal_review_justification ?? null
  if (nextNeedsLegalReview && !nextJustification) {
    return { ok: false, error: t('justificationRequired') }
  }

  if (productIds !== undefined && productIds.length > 0) {
    if (!(await areDraftProductsValid(productIds))) {
      return { ok: false, error: t('invalidProducts') }
    }
  }

  await updateCurationDraft(id, userId, patch, productIds)
  return { ok: true, data: null }
}

/** Preserves the curation flow's publish checks. */
async function publishElsewhere(id: string, userId: string, t: Translations): Promise<PublishPublicationResult> {
  const draft = await getCurationDraft(id)
  if (!draft || draft.user_id !== userId) {
    return { ok: false, error: t('draftNotFound') }
  }
  if (draft.status !== 'draft') {
    return { ok: false, error: t('alreadyPublished') }
  }

  const blockers: string[] = []

  if (!isChecklistComplete(draft.curation_checklist)) {
    const labels = await getTranslations('CurationCriteria')
    const missing = missingCriteria(draft.curation_checklist).map((criterion) => labels(`${criterion}.label`))
    blockers.push(t('blockers.criteria', { criteria: missing.join(', ') }))
  }

  if (draft.needs_legal_review) {
    blockers.push(t('blockers.legalReview'))
  }

  if (draft.file_hosting_type !== CURATED_FILE_HOSTING_TYPE) {
    blockers.push(t('blockers.hosted'))
  }

  if (!draft.license_id) {
    blockers.push(t('blockers.sourceLicense'))
  } else {
    const license = await getLicenseById(draft.license_id)
    if (!license) {
      blockers.push(t('blockers.licenseUnverified'))
    }
  }

  if (!draft.source_platform) {
    blockers.push(t('sourcePlatformRequired'))
  }
  if (draft.model_file_count > 0) {
    blockers.push(t('blockers.removeModelFiles'))
  }

  if (draft.product_ids.length < 1) {
    blockers.push(t('blockers.product'))
  } else {
    const linkBlocker = await findProductLinkBlocker(draft.product_ids)
    if (linkBlocker) blockers.push(t(`blockers.${linkBlocker}`))
  }

  if (blockers.length > 0) {
    return { ok: false, error: t('publicationBlocked'), blockers }
  }

  const published = await publishDraftPart(id, userId)
  if (!published) {
    return { ok: false, error: t('alreadyPublished') }
  }
  return { ok: true, data: { slug: draft.slug } }
}
