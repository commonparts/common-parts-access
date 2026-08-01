'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownInput } from '@/components/ui/dropdown-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Stepper } from '@/components/ui/stepper'
import { CreateProductModal } from '@/components/forms/create-product-modal'
import { CompatibilityStep } from '@/components/publish/compatibility-step'
import { DetailsStep } from '@/components/publish/details-step'
import { FilesStep } from '@/components/publish/files-step'
import { ReviewStep } from '@/components/publish/review-step'
import { StepNav } from '@/components/publish/step-nav'
import { useModelUploadFormState } from '@/hooks/use-model-upload-form-state'
import { uploadFilesFromClient } from '@/lib/storage/client-upload'
import { ATTESTATION_CLAUSES, ATTESTATION_SUMMARY } from '@/lib/upload/attestation'
import { originalTrackBlockers } from '@/lib/publish/blockers'
import {
  PUBLISH_STEPS,
  PUBLISH_STEP_LABELS,
  firstBlockedStep,
  type PublishStepIndex,
} from '@/lib/publish/steps'
import { isHostableLicense } from '@/lib/utils/licenses'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'
import { serializeModelMetadata } from '@/lib/utils/model-metadata'

interface OriginalTrackProps {
  /** Existing draft to resume, or null to start a new part. */
  draftId: string | null
  /** Called when the session ends (published or saved for later). */
  onExit: () => void
}

/** Formats a nullable number from the draft into a form input string. */
const numToStr = (value: number | null | undefined): string =>
  value === null || value === undefined ? '' : String(value)

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
  const router = useRouter()
  const form = useModelUploadFormState()
  const { formData, setFormData } = form

  const [step, setStep] = React.useState<PublishStepIndex>(PUBLISH_STEPS.ORIGIN)
  const [draftId, setDraftId] = React.useState<string | null>(initialDraftId)
  const [draftSlug, setDraftSlug] = React.useState<string | null>(null)
  const [userId, setUserId] = React.useState<string | null>(null)
  const [hydrating, setHydrating] = React.useState(Boolean(initialDraftId))

  // A draft only exists because the declaration was made, so a resumed
  // session starts attested and the checkbox is only live on a new part.
  const [attested, setAttested] = React.useState(Boolean(initialDraftId))
  const [attestedAt, setAttestedAt] = React.useState<string | null>(null)

  const [modelFileCount, setModelFileCount] = React.useState(0)
  // Registered image URLs in canonical order (index 0 is the thumbnail).
  const [imageUrls, setImageUrls] = React.useState<string[]>([])
  const [uploadingFiles, setUploadingFiles] = React.useState(false)

  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

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
          if (!cancelled) setError(json.error || 'Failed to load the draft')
          return
        }
        if (cancelled) return

        const draft = json.draft
        setDraftSlug(draft.slug)
        setFormData((prev) => ({
          ...prev,
          title: draft.name ?? '',
          description: draft.description ?? '',
          instructions: draft.instructions ?? '',
          categoryId: draft.category_id ?? '',
          brandId: draft.brand_id ?? '',
          productIds: Array.isArray(draft.product_ids) ? draft.product_ids : [],
          licenseId: draft.license_id ?? '',
          tags: Array.isArray(draft.tags) ? draft.tags : [],
          // The draft stores dimensions/print_settings as objects and the
          // estimates as numbers; the form holds each as a flat string.
          material: draft.material ?? '',
          color: draft.color ?? '',
          dimensionsLength: numToStr(draft.dimensions?.length),
          dimensionsWidth: numToStr(draft.dimensions?.width),
          dimensionsHeight: numToStr(draft.dimensions?.height),
          dimensionsUnit: draft.dimensions?.unit ?? 'mm',
          layerHeight: numToStr(draft.print_settings?.layer_height),
          infill: numToStr(draft.print_settings?.infill),
          supports: draft.print_settings?.supports ?? '',
          estimatedPrintTime: numToStr(draft.estimated_print_time),
          estimatedMaterialUsage: numToStr(draft.estimated_material_usage),
        }))
        form.setCategoryPathFromCategoryId(draft.category_id)
        setAttested(draft.originality_attested === true)
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
              brandId: draft.brand_id ?? '',
              productCount: Array.isArray(draft.product_ids) ? draft.product_ids.length : 0,
            }),
          ),
        )
      } catch {
        if (!cancelled) setError('Failed to load the draft')
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
      setFormData((prev) => ({ ...prev, licenseId: '' }))
    }
  }, [formData.licenseId, form.licenses, setFormData])

  const patchDraft = React.useCallback(
    async (body: Record<string, unknown>): Promise<boolean> => {
      if (!draftId) return false
      const res = await fetch(`/api/upload/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error || 'Failed to save the draft')
        return false
      }
      return true
    },
    [draftId],
  )

  /** Persists the data owned by the given step. Returns false on failure. */
  const saveStep = React.useCallback(
    async (stepIndex: PublishStepIndex): Promise<boolean> => {
      setError(null)
      setSaving(true)
      try {
        if (stepIndex === PUBLISH_STEPS.ORIGIN) {
          if (draftId) {
            return await patchDraft({
              title: formData.title,
              categoryId: formData.categoryId,
              licenseId: formData.licenseId,
            })
          }
          const res = await fetch('/api/upload/drafts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: formData.title,
              categoryId: formData.categoryId,
              licenseId: formData.licenseId,
              attested,
            }),
          })
          const json = await res.json().catch(() => ({}))
          if (!res.ok) {
            setError(json.error || 'Failed to create the draft')
            return false
          }
          setDraftId(json.draft.id)
          setDraftSlug(json.draft.slug)
          return true
        }

        // The Files step writes through the file-registration endpoint at
        // upload time, so there is nothing left to persist on transition.

        if (stepIndex === PUBLISH_STEPS.DETAILS) {
          return await patchDraft({
            description: formData.description,
            instructions: formData.instructions,
            tags: formData.tags,
            ...serializeModelMetadata(formData),
          })
        }

        if (stepIndex === PUBLISH_STEPS.COMPATIBILITY) {
          return await patchDraft({
            brandId: formData.brandId ?? '',
            productIds: formData.productIds,
          })
        }

        return true
      } catch {
        setError('Failed to save the draft')
        return false
      } finally {
        setSaving(false)
      }
    },
    [draftId, formData, attested, patchDraft],
  )

  const goTo = async (nextStep: PublishStepIndex) => {
    const ok = await saveStep(step)
    if (ok) setStep(nextStep)
  }

  const saveAndExit = async () => {
    const ok = await saveStep(step)
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
        modelId: draftId,
        modelFiles: formData.files,
        thumbnails: formData.thumbnails,
      })
      const allFiles = [...uploads.modelFiles, ...uploads.thumbnails]
      const res = await fetch(`/api/models/${encodeURIComponent(draftSlug)}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: allFiles }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || 'Failed to register uploaded files')
        return
      }
      setModelFileCount((count) => count + uploads.modelFiles.length)
      if (Array.isArray(json.images)) setImageUrls(json.images)
      setFormData((prev) => ({ ...prev, files: [], thumbnails: [] }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File upload failed')
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
      const saved = await saveStep(step)
      if (!saved) return

      const res = await fetch(`/api/upload/drafts/${draftId}/publish`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (Array.isArray(json.blockers)) setPublishBlockers(json.blockers)
        setError(json.error || 'Publication failed')
        return
      }
      router.push(`/parts/${json.slug}`)
    } catch {
      setError('Publication failed')
    } finally {
      setPublishing(false)
    }
  }

  const hostableLicenses = React.useMemo(
    () => form.licenses.filter(isHostableLicense),
    [form.licenses],
  )

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
    brandId: formData.brandId ?? '',
    productCount: formData.productIds.length,
  })

  // Draft creation needs everything the Origin step owns; later steps are free
  // to advance with blockers outstanding, which Review lists.
  const originStepReady =
    formData.title.trim().length >= VALIDATION_LIMITS.MODEL.TITLE_MIN_LENGTH &&
    formData.categoryId.length > 0 &&
    formData.licenseId.length > 0 &&
    attested

  if (hydrating) {
    return <p className="text-sm text-text-secondary">Loading your draft…</p>
  }

  return (
    <div className="space-y-md">
      <Stepper labels={PUBLISH_STEP_LABELS} current={step} ariaLabel="Publish steps" />

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-sm text-sm text-destructive">
          {error}
        </div>
      )}

      {step === PUBLISH_STEPS.ORIGIN && (
        <div className="space-y-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Origin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-md">
              <div className="space-y-2xs">
                <Label htmlFor="original-title">Part title *</Label>
                <Input
                  id="original-title"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Dishwasher rack wheel clip"
                  maxLength={VALIDATION_LIMITS.MODEL.TITLE_MAX_LENGTH}
                  required
                />
              </div>

              <div className="space-y-2xs">
                <Label>Category *</Label>
                <div className="grid grid-cols-1 gap-sm md:grid-cols-3">
                  {form.categoryLevels.map((level, idx) => (
                    <DropdownInput
                      as="select"
                      key={level.parentId ?? `root-${idx}`}
                      value={form.categoryPath[idx] ?? ''}
                      onChange={(e) => form.handleCategorySelect(idx, e.target.value)}
                      disabled={form.loadingMeta}
                      required={idx === 0}
                    >
                      <option value="">
                        {form.loadingMeta
                          ? 'Loading categories…'
                          : idx === 0
                            ? 'Select category'
                            : 'Refine (optional)'}
                      </option>
                      {level.options.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </DropdownInput>
                  ))}
                </div>
              </div>

              <div className="space-y-2xs">
                <Label htmlFor="original-license">License *</Label>
                <DropdownInput
                  as="select"
                  id="original-license"
                  value={formData.licenseId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, licenseId: e.target.value }))}
                  disabled={form.loadingMeta}
                  required
                >
                  <option value="">
                    {form.loadingMeta ? 'Loading licenses…' : 'Select the license you publish under'}
                  </option>
                  {hostableLicenses.map((license) => (
                    <option key={license.id} value={license.id}>
                      {license.shortName} — {license.name}
                    </option>
                  ))}
                </DropdownInput>
                <p className="text-sm text-text-secondary">
                  Common Parts hosts and redistributes your files, so the license must allow
                  commercial use and modification. Licenses with NC or ND restrictions cannot be
                  offered on this track.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Originality declaration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-sm">
              <ul className="space-y-2xs text-sm text-text-secondary">
                {ATTESTATION_CLAUSES.map((clause) => (
                  <li key={clause.key} className="flex gap-2xs">
                    <span aria-hidden="true">—</span>
                    <span>{clause.text}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-start gap-sm">
                <Checkbox
                  id="original-attested"
                  checked={attested}
                  onCheckedChange={(checked) => setAttested(Boolean(checked))}
                  disabled={Boolean(draftId)}
                  aria-label={ATTESTATION_SUMMARY}
                />
                <Label htmlFor="original-attested" className="text-text-primary">
                  {ATTESTATION_SUMMARY}
                </Label>
              </div>
              {draftId && (
                <p className="text-sm text-text-secondary">
                  {attestedAt
                    ? `The declaration was recorded on ${new Date(attestedAt).toLocaleDateString()}, when this draft was created.`
                    : 'The declaration was recorded when this draft was created.'}
                </p>
              )}
            </CardContent>
          </Card>

          <StepNav
            onBack={onExit}
            backLabel="Exit"
            onSaveAndExit={draftId ? saveAndExit : undefined}
            onContinue={() => goTo(PUBLISH_STEPS.FILES)}
            continueLabel={draftId ? 'Save and continue' : 'Create draft and continue'}
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
          <CompatibilityStep form={form} idPrefix="original" brandRequired />
          <StepNav
            onBack={() => goTo(PUBLISH_STEPS.DETAILS)}
            onSaveAndExit={saveAndExit}
            onContinue={() => goTo(PUBLISH_STEPS.REVIEW)}
            continueLabel="Review"
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
