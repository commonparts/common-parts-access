'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { Alert } from '@/components/ui/alert'
import { Stepper } from '@/components/ui/stepper'
import { OriginalOriginStep } from '@/components/publish/original-origin-step'
import { CreateProductModal } from '@/components/forms/create-product-modal'
import { CompatibilityStep } from '@/components/publish/compatibility-step'
import { DetailsStep } from '@/components/publish/details-step'
import { FilesStep } from '@/components/publish/files-step'
import { ReviewStep } from '@/components/publish/review-step'
import { StepNav } from '@/components/publish/step-nav'
import { usePartUploadFormState } from '@/hooks/use-part-upload-form-state'
import { StorageUploadError, uploadFilesFromClient } from '@/lib/storage/client-upload'
import { originalTrackBlockers } from '@/lib/publish/blockers'
import {
  PUBLISH_STEPS,
  PUBLISH_STEP_NAMES,
  firstBlockedStep,
  type PublishStepIndex,
} from '@/lib/publish/steps'
import { isHostableLicense } from '@/lib/utils/licenses'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'
import { draftFormValues } from '@/lib/publish/hydration'
import { publishPublication } from '@/lib/actions/publish'

interface OriginalTrackProps {
  /** Existing draft to resume, or null to start a new part. */
  draftId: string | null
  /** Called when the session ends (published or saved for later). */
  onExit: () => void
}

/**
 * The original track (issue #293, restructured in #302): a contributor
 * publishing a part they designed, whose files Common Parts hosts.
 *
 * Five steps shared with the elsewhere track, each transition persisting to
 * the draft. The flow deliberately exposes no origin, hosting or verification
 * control — a part already published elsewhere belongs to the other track, and
 * the upload endpoints reject a payload that tries to set any of them.
 */
export function OriginalTrack({ draftId: initialDraftId, onExit }: OriginalTrackProps) {
  const flow = useTranslations('PublishFlow')
  const steps = useTranslations('PublishSteps')
  const router = useRouter()
  const [step, setStep] = React.useState<PublishStepIndex>(PUBLISH_STEPS.ORIGIN)
  const [draftId, setDraftId] = React.useState<string | null>(initialDraftId)
  const form = usePartUploadFormState({ track: 'original', step, draftId, preselectFirstLicense: true })
  const { formData, setValue, reset, setFormError: setError, error, saving } = form
  const [draftSlug, setDraftSlug] = React.useState<string | null>(null)
  const [userId, setUserId] = React.useState<string | null>(null)
  const [hydrating, setHydrating] = React.useState(Boolean(initialDraftId))

  // A draft only exists because the declaration was made, so a resumed
  // session starts attested and the checkbox is only live on a new part.
  const { attested } = formData
  const [attestedAt, setAttestedAt] = React.useState<string | null>(null)

  const [modelFileCount, setModelFileCount] = React.useState(0)
  // Registered image URLs in canonical order (index 0 is the thumbnail).
  const [imageUrls, setImageUrls] = React.useState<string[]>([])
  const [uploadingFiles, setUploadingFiles] = React.useState(false)

  const [publishing, setPublishing] = React.useState(false)
  const [publishBlockers, setPublishBlockers] = React.useState<string[]>([])

  // The storage upload path needs the owner id for the object prefix.
  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  // Resume: hydrate the form from the persisted draft, then open on the first
  // step that still has an unmet publish condition.
  React.useEffect(() => {
    if (!initialDraftId) return
    let cancelled = false

    async function hydrate() {
      try {
        const res = await fetch(`/api/upload/drafts/${initialDraftId}`)
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json.draft) {
          if (!cancelled) setError(json.error || flow('loadFailed'))
          return
        }
        if (cancelled) return

        const draft = json.draft
        setDraftSlug(draft.slug)
        reset(draftFormValues(draft))
        setAttestedAt(draft.originality_attested_at ?? null)
        setModelFileCount(draft.model_file_count ?? 0)
        const images = Array.isArray(draft.images)
          ? draft.images.filter((url: unknown): url is string => typeof url === 'string')
          : []
        setImageUrls(images)

        // Derived from the draft rather than from state, which has not
        // committed yet at this point in the effect.
        setStep(
          firstBlockedStep(
            originalTrackBlockers({
              title: draft.name ?? '',
              categoryId: draft.category_id ?? '',
              licenseId: draft.license_id ?? '',
              attested: draft.originality_attested === true,
              modelFileCount: draft.model_file_count ?? 0,
              productCount: Array.isArray(draft.product_ids) ? draft.product_ids.length : 0,
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

  // The shared form hook preselects the first license it loads, which is not
  // necessarily hostable. This track only hosts, so an unhostable preselection
  // is cleared and the contributor picks from the whitelist explicitly.
  React.useEffect(() => {
    if (!formData.licenseId || form.licenses.length === 0) return
    const license = form.licenses.find((l) => l.id === formData.licenseId)
    if (license && !isHostableLicense(license)) {
      setValue('licenseId', '')
    }
  }, [formData.licenseId, form.licenses, setValue])

  const saveStep = async (): Promise<boolean> => {
    const result = await form.submit((draft) => {
      setDraftId(draft.id)
      setDraftSlug(draft.slug)
    })
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
        modelFiles: formData.files,
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

  const handlePublish = async () => {
    if (!draftId) return
    setPublishing(true)
    setPublishBlockers([])
    setError(null)
    try {
      // Persist any pending step edits before the server-side gate runs.
      const saved = await saveStep()
      if (!saved) return

      const result = await publishPublication({ track: 'original', id: draftId })
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

  // The storage path needs the draft and the owner id, and the owner id
  // arrives from an async auth call — so there is a window on the Files step
  // where an upload would silently do nothing. Gate the button on it instead.
  const uploadReady = Boolean(draftId && draftSlug && userId)

  const blockers = originalTrackBlockers({
    title: formData.title,
    categoryId: formData.categoryId,
    licenseId: formData.licenseId,
    attested,
    modelFileCount,
    productCount: formData.productIds.length,
  })

  // Draft creation needs everything the Origin step owns; later steps are free
  // to advance with blockers outstanding, which Review lists.
  const originStepReady =
    formData.title.trim().length >= VALIDATION_LIMITS.PART.TITLE_MIN_LENGTH &&
    formData.categoryId.length > 0 &&
    formData.licenseId.length > 0 &&
    attested

  if (hydrating) {
    return <p className="text-sm text-text-secondary">{flow('loadingDraft')}</p>
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
          <OriginalOriginStep form={form} draftId={draftId} attestedAt={attestedAt} />

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
            idPrefix="original"
            modelFileCount={modelFileCount}
            imageUrls={imageUrls}
            uploading={uploadingFiles}
            uploadReady={uploadReady}
            onUpload={handleUploadFiles}
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
          <DetailsStep form={form} idPrefix="original" />
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
          <CompatibilityStep form={form} idPrefix="original" />
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
        />
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
