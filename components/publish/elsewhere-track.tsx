'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Stepper } from '@/components/ui/stepper'
import { ElsewhereOriginStep } from '@/components/publish/elsewhere-origin-step'
import { CreateProductModal } from '@/components/forms/create-product-modal'
import { DemandPanel } from '@/components/publish/demand-panel'
import { ChecklistRollup } from '@/components/publish/checklist-rollup'
import { CompatibilityStep } from '@/components/publish/compatibility-step'
import { DetailsStep } from '@/components/publish/details-step'
import { FilesStep } from '@/components/publish/files-step'
import { CurationCriterion, CompletenessFlags } from '@/components/publish/curation-judgements'
import { LegalReviewEscalation } from '@/components/publish/legal-review-escalation'
import { RejectionRecorder } from '@/components/publish/rejection-recorder'
import { ReviewStep } from '@/components/publish/review-step'
import { StepNav } from '@/components/publish/step-nav'
import { usePartUploadFormState } from '@/hooks/use-part-upload-form-state'
import { StorageUploadError, uploadFilesFromClient } from '@/lib/storage/client-upload'
import { missingCriteria } from '@/lib/curation/checklist'
import { CURATED_FILE_HOSTING_TYPE } from '@/lib/curation/hosting'
import { shouldImportOnResume, supportsImageImport } from '@/lib/curation/image-import'
import { elsewhereTrackBlockers } from '@/lib/publish/blockers'
import {
  PUBLISH_STEPS,
  PUBLISH_STEP_NAMES,
  firstBlockedStep,
  type PublishStepIndex,
} from '@/lib/publish/steps'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'
import { draftFormValues } from '@/lib/publish/hydration'
import { publishPublication } from '@/lib/actions/publish'
import type { CurationChecklist } from '@/types/database'
import type { SourceUrlMatch } from '@/lib/supabase/queries/curation'

const SOURCE_CHECK_DEBOUNCE_MS = 500

const PREFILLABLE_FIELDS = [
  'sourcePlatform',
  'originalAuthor',
  'originalAuthorUrl',
  'licenseId',
  'description',
  'instructions',
  'material',
  'layerHeight',
  'estimatedPrintTime',
  'estimatedMaterialUsage',
] as const
type PrefillableField = (typeof PREFILLABLE_FIELDS)[number]

/** Shape returned by GET /api/curation/prefill — null means not extractable. */
type PrefillValues = Record<PrefillableField, string | null>

interface ElsewhereTrackProps {
  /** Existing draft to resume, or null to start a new session. */
  draftId: string | null
  /** Called when the session ends (published, turned down, or saved). */
  onExit: () => void
  /** Source platforms the server can import a gallery from (#431). */
  imageImportPlatforms: readonly string[]
}

/**
 * The elsewhere track (Flow P3, restructured in #302): publishing a part that
 * is already available on another platform, crediting its original author.
 *
 * Same five steps as the original track. The blocking checklist no longer has
 * a step of its own — each criterion is confirmed next to the evidence it
 * judges, and Review rolls them up above the publish button. Their definition,
 * their storage in `parts.curation_checklist` and the server-side gate are
 * unchanged.
 *
 * A part published elsewhere is always referenced (#396): its files stay at
 * the source and only photos are uploaded here. The track offers no hosting
 * choice and saves every draft as `link_out`.
 *
 * The part keeps the license its designer chose at the source (#374): one
 * field on Origin, stored in `license_id`, never defaulted.
 */
export function ElsewhereTrack({
  draftId: initialDraftId,
  onExit,
  imageImportPlatforms,
}: ElsewhereTrackProps) {
  const t = useTranslations('ElsewhereTrack')
  const flow = useTranslations('PublishFlow')
  const steps = useTranslations('PublishSteps')
  const router = useRouter()
  const [step, setStep] = React.useState<PublishStepIndex>(PUBLISH_STEPS.ORIGIN)
  const [draftId, setDraftId] = React.useState<string | null>(initialDraftId)
  const form = usePartUploadFormState({ track: 'elsewhere', step, draftId, preselectFirstLicense: false })
  const { formData, setValue, getValues, reset, setFormError: setError, error, saving } = form
  const [draftSlug, setDraftSlug] = React.useState<string | null>(null)
  const [userId, setUserId] = React.useState<string | null>(null)
  const [hydrating, setHydrating] = React.useState(Boolean(initialDraftId))

  const { checklist, needsLegalReview, legalJustification } = formData

  const [duplicate, setDuplicate] = React.useState<SourceUrlMatch | null>(null)
  const [checkingSource, setCheckingSource] = React.useState(false)
  const [lastPrefill, setLastPrefill] = React.useState<PrefillValues | null>(null)

  const [modelFileCount, setModelFileCount] = React.useState(0)
  // Registered image URLs in canonical order (index 0 is the thumbnail).
  const [imageUrls, setImageUrls] = React.useState<string[]>([])
  const [uploadingFiles, setUploadingFiles] = React.useState(false)
  const [importingImages, setImportingImages] = React.useState(false)
  // Draft id the resume import was fired for — guards against a second fire
  // for the same resume (effect re-run, React strict mode).
  const resumeImportFiredFor = React.useRef<string | null>(null)

  const [rejectReason, setRejectReason] = React.useState('')
  const [rejecting, setRejecting] = React.useState(false)
  const [rejected, setRejected] = React.useState(false)

  const [publishing, setPublishing] = React.useState(false)
  const [publishBlockers, setPublishBlockers] = React.useState<string[]>([])

  // The storage upload path needs the owner id for the object prefix.
  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  /**
   * Imports the source's gallery into a draft that has no image yet (numbered
   * 00-…, 01-… so the source's first image becomes the thumbnail and the
   * slideshow keeps the source order). Fired at draft creation and when a
   * draft is resumed without any image. Fire-and-forget: a failed import is
   * silent — photos can be uploaded manually on the Files step.
   */
  const importImagesFromSource = React.useCallback(async (id: string) => {
    setImportingImages(true)
    try {
      const res = await fetch(`/api/curation/drafts/${id}/import-images`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(json.images)) setImageUrls(json.images)
    } catch {
      // Silent by design — pre-fill never blocks the flow.
    } finally {
      setImportingImages(false)
    }
  }, [])

  // Resume: hydrate everything, then open on the first step that still has an
  // unmet publish condition.
  React.useEffect(() => {
    if (!initialDraftId) return
    const resumedDraftId = initialDraftId
    let cancelled = false

    async function hydrate() {
      try {
        const res = await fetch(`/api/curation/drafts/${initialDraftId}`)
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json.draft) {
          if (!cancelled) setError(json.error || flow('loadFailed'))
          return
        }
        if (cancelled) return

        const draft = json.draft
        // False only for a draft saved as hosted before #396 — its blocker
        // opens the Origin step, whose save references it.
        const referenced = draft.file_hosting_type === CURATED_FILE_HOSTING_TYPE
        setDraftSlug(draft.slug)
        reset(draftFormValues(draft))
        const hydratedChecklist: CurationChecklist = draft.curation_checklist ?? {}
        setModelFileCount(draft.model_file_count ?? 0)
        const hydratedImages: string[] = Array.isArray(draft.images)
          ? draft.images.filter((url: unknown): url is string => typeof url === 'string')
          : []
        setImageUrls(hydratedImages)

        // A draft that reaches the tool without its gallery (created outside
        // the Origin step, or whose import failed at creation) gets the same
        // background import as a freshly created one.
        if (
          resumeImportFiredFor.current !== resumedDraftId &&
          shouldImportOnResume(
            {
              sourcePlatform: draft.source_platform,
              imageFileCount: draft.image_file_count ?? 0,
              imageCount: hydratedImages.length,
            },
            imageImportPlatforms,
          )
        ) {
          resumeImportFiredFor.current = resumedDraftId
          void importImagesFromSource(resumedDraftId)
        }

        // Derived from the draft rather than from state, which has not
        // committed yet at this point in the effect.
        setStep(
          firstBlockedStep(
            elsewhereTrackBlockers({
              checklist: hydratedChecklist,
              referenced,
              sourcePlatform: draft.source_platform ?? '',
              licenseId: draft.license_id ?? '',
              modelFileCount: draft.model_file_count ?? 0,
              productCount: Array.isArray(draft.product_ids) ? draft.product_ids.length : 0,
              needsLegalReview: draft.needs_legal_review === true,
            }),
          ),
        )
      } catch {
        if (!cancelled) setError(flow('loadFailed'))
      } finally {
        if (!cancelled) setHydrating(false)
      }
    }

    hydrate()
    return () => {
      cancelled = true
    }
    // Hydration must run exactly once for the resumed draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDraftId])

  /**
   * Applies extracted values to fields not filled yet — pre-fill never
   * overwrites manual input. The raw response is kept so the "Pre-filled"
   * markers can be derived.
   */
  const applyPrefill = React.useCallback(
    (prefill: PrefillValues) => {
      setLastPrefill(prefill)
      for (const field of PREFILLABLE_FIELDS) {
        const value = prefill[field]
        if (value && !getValues(field).trim()) setValue(field, value)
      }
    },
    [getValues, setValue],
  )

  /**
   * A field is marked pre-filled while its value still matches what was
   * extracted — editing it clears the marker with no extra bookkeeping.
   */
  const prefilledFields = React.useMemo(() => {
    const set = new Set<string>()
    if (!lastPrefill) return set
    for (const field of PREFILLABLE_FIELDS) {
      if (lastPrefill[field] && formData[field] === lastPrefill[field]) set.add(field)
    }
    return set
  }, [lastPrefill, formData])

  // Duplicate check + best-effort pre-fill on the source URL while typing (new
  // sessions only — a resumed draft already owns its URL). Pre-fill failure is
  // silent by design: the flow never blocks on it.
  React.useEffect(() => {
    if (draftId || !formData.sourceUrl.trim()) {
      setDuplicate(null)
      setLastPrefill(null)
      // An in-flight check was cancelled by the cleanup below, so its finally
      // block will not reset the indicator — do it here.
      setCheckingSource(false)
      return
    }

    const url = formData.sourceUrl.trim()
    let cancelled = false
    const timer = setTimeout(async () => {
      setCheckingSource(true)
      try {
        const [dupRes, prefillRes] = await Promise.all([
          fetch(`/api/curation/source-check?url=${encodeURIComponent(url)}`),
          fetch(`/api/curation/prefill?url=${encodeURIComponent(url)}`),
        ])
        const dupJson = await dupRes.json().catch(() => ({}))
        const prefillJson = await prefillRes.json().catch(() => ({}))
        if (cancelled) return
        setDuplicate(dupRes.ok ? (dupJson.duplicate ?? null) : null)
        if (prefillRes.ok && prefillJson.prefill) applyPrefill(prefillJson.prefill)
      } catch {
        if (!cancelled) setDuplicate(null)
      } finally {
        if (!cancelled) setCheckingSource(false)
      }
    }, SOURCE_CHECK_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [formData.sourceUrl, draftId, applyPrefill])

  const saveStep = async (): Promise<boolean> => {
    const result = await form.submit((draft) => {
      setDraftId(draft.id)
      setDraftSlug(draft.slug)
      if (supportsImageImport(formData.sourcePlatform, imageImportPlatforms)) void importImagesFromSource(draft.id)
    })
    if (!result.ok && result.duplicate) setDuplicate(result.duplicate)
    return result.ok
  }

  const goTo = async (nextStep: PublishStepIndex) => {
    const ok = await saveStep()
    if (ok) setStep(nextStep)
  }

  const saveAndExit = async () => {
    const ok = await saveStep()
    if (ok) onExit()
  }

  const handleUploadFiles = async () => {
    if (!draftId || !draftSlug || !userId) return
    if (formData.files.length === 0 && formData.thumbnails.length === 0) return

    setError(null)
    setUploadingFiles(true)
    try {
      const uploads = await uploadFilesFromClient({
        userId,
        partId: draftId,
        // A referenced part never hosts model files — only photos are uploaded.
        modelFiles: [],
        thumbnails: formData.thumbnails,
      })
      const allFiles = [...uploads.modelFiles, ...uploads.thumbnails]
      const res = await fetch(`/api/parts/${encodeURIComponent(draftSlug)}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: allFiles }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || flow('registerFailed'))
        return
      }
      setModelFileCount((count) => count + uploads.modelFiles.length)
      if (Array.isArray(json.images)) setImageUrls(json.images)
      setValue('files', [])
      setValue('thumbnails', [])
    } catch (err) {
      setError(err instanceof StorageUploadError ? flow('uploadFailedFile', { name: err.fileName }) : flow('uploadFailed'))
    } finally {
      setUploadingFiles(false)
    }
  }

  const handleReject = async () => {
    if (!formData.sourceUrl.trim() || !rejectReason.trim()) return
    setRejecting(true)
    setError(null)
    try {
      const res = await fetch('/api/curation/rejections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceUrl: formData.sourceUrl.trim(),
          reason: rejectReason.trim(),
          failedCriteria: missingCriteria(checklist),
        }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error || t('rejectFailed'))
        return
      }
      setRejected(true)
    } catch {
      setError(t('rejectFailed'))
    } finally {
      setRejecting(false)
    }
  }

  const handlePublish = async () => {
    if (!draftId) return
    setPublishing(true)
    setPublishBlockers([])
    setError(null)
    try {
      // Persist any pending step edits before the server-side gate runs.
      const saved = await saveStep()
      if (!saved) return

      const result = await publishPublication({ track: 'elsewhere', id: draftId })
      if (!result.ok) {
        setPublishBlockers(result.blockers ?? [])
        setError(result.error)
        return
      }
      router.push(`/parts/${result.data.slug}`)
    } catch {
      setError(flow('publishFailed'))
    } finally {
      setPublishing(false)
    }
  }

  const blockers = elsewhereTrackBlockers({
    checklist,
    // A draft saved as hosted resumes on Origin, and leaving Origin saves it
    // as referenced — so the live state is always referenced.
    referenced: true,
    sourcePlatform: formData.sourcePlatform,
    licenseId: formData.licenseId,
    modelFileCount,
    productCount: formData.productIds.length,
    needsLegalReview,
  })

  // Draft creation needs the DB minimum for a part from elsewhere.
  const originStepReady =
    formData.title.trim().length >= VALIDATION_LIMITS.PART.TITLE_MIN_LENGTH &&
    formData.sourceUrl.trim().length > 0 &&
    formData.originalAuthor.trim().length > 0 &&
    formData.licenseId.length > 0 &&
    formData.sourcePlatform.length > 0 &&
    !duplicate

  if (hydrating) {
    return <p className="text-sm text-text-secondary">{flow('loadingDraft')}</p>
  }

  if (rejected) {
    return (
      <Card>
        <CardContent className="space-y-sm pt-md">
          <p className="text-text-primary">{t('rejected')}</p>
          <p className="text-sm text-text-secondary">{t('rejectedDetail')}</p>
          <Button onClick={onExit}>{t('backToDrafts')}</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-md">
      <Stepper labels={PUBLISH_STEP_NAMES.map((name) => steps(name))} current={step} ariaLabel={steps('label')} />

      {error && (
        <Alert>
          {error}
        </Alert>
      )}

      {step === PUBLISH_STEPS.ORIGIN && (
        <div className="space-y-md">
          <ElsewhereOriginStep form={form} draftId={draftId} duplicate={duplicate}
            checkingSource={checkingSource} prefilledFields={prefilledFields}>
            <RejectionRecorder
              reason={rejectReason}
              onReasonChange={setRejectReason}
              onRecord={handleReject}
              recording={rejecting}
              sourceUrl={formData.sourceUrl}
            />
          </ElsewhereOriginStep>

          <StepNav
            onBack={onExit}
            backLabel={flow('exit')}
            onSaveAndExit={draftId ? saveAndExit : undefined}
            onContinue={() => goTo(PUBLISH_STEPS.FILES)}
            continueLabel={draftId ? flow('saveAndContinue') : flow('createAndContinue')}
            continueDisabled={!originStepReady}
            saving={saving}
          />
        </div>
      )}

      {step === PUBLISH_STEPS.FILES && (
        <div className="space-y-md">
          <FilesStep
            form={form}
            idPrefix="elsewhere"
            referenced
            sourceUrl={formData.sourceUrl}
            modelFileCount={modelFileCount}
            imageUrls={imageUrls}
            uploading={uploadingFiles}
            uploadReady={Boolean(draftId && draftSlug && userId)}
            onUpload={handleUploadFiles}
            importingImages={importingImages}
            helpText={t('filesHelp')}
            judgements={
              <>
                <CurationCriterion form={form} criterion="file" />
                <CompletenessFlags form={form} step={PUBLISH_STEPS.FILES} />
              </>
            }
          />
          <StepNav
            onBack={() => goTo(PUBLISH_STEPS.ORIGIN)}
            onSaveAndExit={saveAndExit}
            onContinue={() => goTo(PUBLISH_STEPS.DETAILS)}
            saving={saving}
          />
        </div>
      )}

      {step === PUBLISH_STEPS.DETAILS && (
        <div className="space-y-md">
          <DetailsStep
            form={form}
            idPrefix="elsewhere"
            prefilledFields={prefilledFields}
            flags={
              <div className="space-y-sm border-t border-border-subtle pt-md">
                <CompletenessFlags form={form} step={PUBLISH_STEPS.DETAILS} />
              </div>
            }
          />
          <StepNav
            onBack={() => goTo(PUBLISH_STEPS.FILES)}
            onSaveAndExit={saveAndExit}
            onContinue={() => goTo(PUBLISH_STEPS.COMPATIBILITY)}
            saving={saving}
          />
        </div>
      )}

      {step === PUBLISH_STEPS.COMPATIBILITY && (
        <div className="space-y-md">
          <CompatibilityStep
            form={form}
            idPrefix="elsewhere"
            syncCategoryFromProduct
            demandPanel={
              <DemandPanel productIds={formData.productIds} productNames={form.productNames} />
            }
            judgements={<CurationCriterion form={form} criterion="product_target" />}
          />
          <StepNav
            onBack={() => goTo(PUBLISH_STEPS.DETAILS)}
            onSaveAndExit={saveAndExit}
            onContinue={() => goTo(PUBLISH_STEPS.REVIEW)}
            continueLabel={steps('review')}
            saving={saving}
          />
        </div>
      )}

      {step === PUBLISH_STEPS.REVIEW && draftSlug && (
        <ReviewStep
          slug={draftSlug}
          blockers={blockers}
          serverBlockers={publishBlockers}
          publishing={publishing}
          saving={saving}
          onBack={() => goTo(PUBLISH_STEPS.COMPATIBILITY)}
          onSaveAsDraft={saveAndExit}
          onPublish={handlePublish}
          onJumpTo={goTo}
        >
          <ChecklistRollup checklist={checklist} onJumpTo={goTo} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('printConfirmation')}</CardTitle>
            </CardHeader>
            <CardContent><CompletenessFlags form={form} step={PUBLISH_STEPS.REVIEW} /></CardContent>
          </Card>
          <LegalReviewEscalation
            needsLegalReview={needsLegalReview}
            onNeedsLegalReviewChange={(value) => setValue('needsLegalReview', value)}
            justification={legalJustification}
            onJustificationChange={(value) => setValue('legalJustification', value)}
          />
          <RejectionRecorder
            reason={rejectReason}
            onReasonChange={setRejectReason}
            onRecord={handleReject}
            recording={rejecting}
            sourceUrl={formData.sourceUrl}
          />
        </ReviewStep>
      )}

      <CreateProductModal
        open={form.showCreateProduct}
        onClose={form.closeCreateProduct}
        brands={form.brands}
        categories={form.flatCategories}
        data={form.createProductData}
        error={form.createProductError}
        loading={form.creatingProduct}
        onChange={form.updateCreateField}
        onSubmit={form.handleCreateProductSubmit}
      />
    </div>
  )
}
