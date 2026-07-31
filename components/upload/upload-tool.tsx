'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Combobox } from '@/components/ui/combobox'
import { DropdownInput } from '@/components/ui/dropdown-input'
import { FileUploader } from '@/components/ui/file-uploader'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Stepper } from '@/components/ui/stepper'
import { Textarea } from '@/components/ui/textarea'
import { CreateProductModal } from '@/components/forms/create-product-modal'
import { ModelDetails } from '@/components/model/model-details'
import { useModelUploadFormState } from '@/hooks/use-model-upload-form-state'
import { uploadFilesFromClient } from '@/lib/storage/client-upload'
import { ATTESTATION_CLAUSES, ATTESTATION_SUMMARY } from '@/lib/upload/attestation'
import { FILE_TYPES } from '@/constants/app'
import { isHostableLicense } from '@/lib/utils/licenses'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'
import { serializeModelMetadata } from '@/lib/utils/model-metadata'

const STEP_LABELS = ['Part', 'Files', 'Details', 'Compatibility', 'Review'] as const

/** Step index the tool opens at when resuming an existing draft. */
const RESUME_STEP = 1

interface UploadToolProps {
  /** Existing draft to resume, or null to start a new part. */
  draftId: string | null
  /** Called when the session ends (published or saved for later). */
  onExit: () => void
}

/** Formats a nullable number from the draft into a form input string. */
const numToStr = (value: number | null | undefined): string =>
  value === null || value === undefined ? '' : String(value)

/**
 * Guided upload session (issue #293): the public flow for publishing an
 * original part whose files this registry hosts. Every step transition
 * persists to the draft, so an interrupted session loses nothing.
 *
 * The flow deliberately exposes no origin, hosting or verification control —
 * a part sourced from another platform belongs to the curation flow, and the
 * upload endpoints reject a payload that tries to set any of them.
 */
export function UploadTool({ draftId: initialDraftId, onExit }: UploadToolProps) {
  const router = useRouter()
  const form = useModelUploadFormState()
  const { formData, setFormData } = form

  const [step, setStep] = React.useState(0)
  const [draftId, setDraftId] = React.useState<string | null>(initialDraftId)
  const [draftSlug, setDraftSlug] = React.useState<string | null>(null)
  const [userId, setUserId] = React.useState<string | null>(null)
  const [hydrating, setHydrating] = React.useState(Boolean(initialDraftId))

  // A draft only exists because the declaration was made, so a resumed
  // session starts attested and the checkbox is only live on a new part.
  const [attested, setAttested] = React.useState(Boolean(initialDraftId))

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

  // Resume: hydrate the form from the persisted draft.
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
        setModelFileCount(draft.model_file_count ?? 0)
        setImageUrls(
          Array.isArray(draft.images)
            ? draft.images.filter((url: unknown): url is string => typeof url === 'string')
            : [],
        )
        setStep(RESUME_STEP)
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
  // necessarily hostable. This flow only hosts, so an unhostable preselection
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
    async (stepIndex: number): Promise<boolean> => {
      setError(null)
      setSaving(true)
      try {
        if (stepIndex === 0) {
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

        // Step 1 (files) writes through the file-registration endpoint at
        // upload time, so there is nothing left to persist on transition.

        if (stepIndex === 2) {
          return await patchDraft({
            description: formData.description,
            instructions: formData.instructions,
            tags: formData.tags,
            ...serializeModelMetadata(formData),
          })
        }

        if (stepIndex === 3) {
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

  const goTo = async (nextStep: number) => {
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

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      form.addTag(form.tagInput)
    }
  }

  const productNames = React.useMemo(
    () => Object.fromEntries(form.products.map((p) => [p.id, p.name])),
    [form.products],
  )

  const hostableLicenses = React.useMemo(
    () => form.licenses.filter(isHostableLicense),
    [form.licenses],
  )

  // The storage path needs the draft and the owner id, and the owner id
  // arrives from an async auth call — so there is a window on the files step
  // where an upload would silently do nothing. Gate the button on it instead.
  const uploadReady = Boolean(draftId && draftSlug && userId)

  const partStepReady =
    formData.title.trim().length >= VALIDATION_LIMITS.MODEL.TITLE_MIN_LENGTH &&
    formData.categoryId.length > 0 &&
    formData.licenseId.length > 0 &&
    attested

  // Mirrors the server gate so the review step can explain a blocked publish
  // before the round trip. The server remains the authority.
  const missingForPublish = [
    modelFileCount < 1 ? 'at least one model file' : null,
    !formData.brandId ? 'a brand' : null,
    formData.productIds.length < 1 ? 'at least one compatible product' : null,
  ].filter((item): item is string => item !== null)

  if (hydrating) {
    return <p className="text-sm text-text-secondary">Loading upload session…</p>
  }

  return (
    <div className="space-y-md">
      <Stepper labels={STEP_LABELS} current={step} ariaLabel="Upload steps" />

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-sm text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step 1 — Part identity, license and the originality declaration */}
      {step === 0 && (
        <div className="space-y-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Part</CardTitle>
            </CardHeader>
            <CardContent className="space-y-md">
              <div className="space-y-2xs">
                <Label htmlFor="upload-title">Part title *</Label>
                <Input
                  id="upload-title"
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
                        {form.loadingMeta ? 'Loading categories…' : idx === 0 ? 'Select category' : 'Refine (optional)'}
                      </option>
                      {level.options.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </DropdownInput>
                  ))}
                </div>
              </div>

              <div className="space-y-2xs">
                <Label htmlFor="upload-license">License *</Label>
                <DropdownInput
                  as="select"
                  id="upload-license"
                  value={formData.licenseId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, licenseId: e.target.value }))}
                  disabled={form.loadingMeta}
                  required
                >
                  <option value="">
                    {form.loadingMeta ? 'Loading licenses…' : 'Select the license you publish under'}
                  </option>
                  {hostableLicenses.map((license) => (
                    <option key={license.id} value={license.id}>{license.shortName} — {license.name}</option>
                  ))}
                </DropdownInput>
                <p className="text-sm text-text-secondary">
                  The registry hosts your files, so the license must allow commercial use and modification.
                  Licenses with NC or ND restrictions are not offered here.
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
                  id="upload-attested"
                  checked={attested}
                  onCheckedChange={(checked) => setAttested(Boolean(checked))}
                  disabled={Boolean(draftId)}
                  aria-label={ATTESTATION_SUMMARY}
                />
                <Label htmlFor="upload-attested" className="text-text-primary">
                  {ATTESTATION_SUMMARY}
                </Label>
              </div>
              {draftId && (
                <p className="text-sm text-text-secondary">
                  The declaration was recorded when this draft was created.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={onExit}>Exit</Button>
            <Button onClick={() => goTo(1)} disabled={!partStepReady || saving}>
              {saving ? 'Saving…' : draftId ? 'Save and continue' : 'Create draft and continue'}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 — Files */}
      {step === 1 && (
        <div className="space-y-md">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Files</CardTitle>
              <div className="flex gap-2xs">
                <Badge variant={modelFileCount > 0 ? 'secondary' : 'outline'}>
                  {modelFileCount} model {modelFileCount === 1 ? 'file' : 'files'}
                </Badge>
                <Badge variant={imageUrls.length > 0 ? 'secondary' : 'outline'}>
                  {imageUrls.length} {imageUrls.length === 1 ? 'image' : 'images'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-md">
              <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                <div className="space-y-2xs">
                  <Label>Model files (STL / 3MF / STEP) *</Label>
                  <FileUploader
                    accept={FILE_TYPES.MODEL_FILES.join(',')}
                    multiple
                    onFilesSelect={form.handleFilesSelect}
                  />
                  {formData.files.length > 0 && (
                    <p className="text-sm text-text-secondary">
                      Selected: {formData.files.map((f) => f.name).join(', ')}
                    </p>
                  )}
                </div>
                <div className="space-y-2xs">
                  <Label>Photos of the printed part</Label>
                  <FileUploader
                    accept={FILE_TYPES.IMAGE_FILES.join(',')}
                    multiple
                    onFilesSelect={form.handleThumbnailsSelect}
                  />
                  {formData.thumbnails.length > 0 && (
                    <p className="text-sm text-text-secondary">
                      Selected: {formData.thumbnails.map((f) => f.name).join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {imageUrls.length > 0 && (
                <div className="space-y-2xs">
                  <p className="text-sm text-text-secondary">
                    {imageUrls.length} {imageUrls.length === 1 ? 'image is' : 'images are'} on the draft, in slideshow order — the first is the thumbnail.
                  </p>
                  <div className="flex flex-wrap gap-2xs">
                    {imageUrls.map((url, index) => (
                      <div
                        key={url}
                        className="relative h-3xl w-3xl overflow-hidden rounded-md border border-border-subtle bg-bg-subtle"
                      >
                        <Image
                          src={url}
                          alt={index === 0 ? 'Thumbnail' : `Image ${index + 1}`}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                        {index === 0 && (
                          <span className="absolute inset-x-0 bottom-0 bg-background/70 py-px text-center text-xs text-text-primary">
                            Thumbnail
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-sm">
                <Button
                  onClick={handleUploadFiles}
                  disabled={
                    uploadingFiles ||
                    !uploadReady ||
                    (formData.files.length === 0 && formData.thumbnails.length === 0)
                  }
                >
                  {uploadingFiles ? 'Uploading…' : 'Upload selected files'}
                </Button>
                <p className="text-sm text-text-secondary">
                  {uploadReady
                    ? 'Files are stored as soon as you upload them — you can leave and come back.'
                    : 'Preparing the upload session…'}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => goTo(0)} disabled={saving}>Back</Button>
            <div className="flex gap-sm">
              <Button variant="ghost" onClick={saveAndExit} disabled={saving}>Save and exit</Button>
              <Button onClick={() => goTo(2)} disabled={saving}>{saving ? 'Saving…' : 'Continue'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — Details */}
      {step === 2 && (
        <div className="space-y-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Part details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-md">
              <div className="space-y-2xs">
                <Label htmlFor="upload-description">Short description</Label>
                <Textarea
                  id="upload-description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="What the part is and what it fixes"
                  maxLength={VALIDATION_LIMITS.MODEL.DESCRIPTION_MAX_LENGTH}
                />
                <div className="flex justify-end text-caption text-text-secondary">
                  <span>{formData.description.length}/{VALIDATION_LIMITS.MODEL.DESCRIPTION_MAX_LENGTH}</span>
                </div>
              </div>

              <div className="space-y-2xs">
                <Label htmlFor="upload-instructions">Instructions</Label>
                <Textarea
                  id="upload-instructions"
                  rows={6}
                  value={formData.instructions}
                  onChange={(e) => setFormData((prev) => ({ ...prev, instructions: e.target.value }))}
                  placeholder="How to print it, and how to fit it to the product"
                  maxLength={VALIDATION_LIMITS.MODEL.INSTRUCTIONS_MAX_LENGTH}
                />
                <div className="flex justify-end text-caption text-text-secondary">
                  <span>{formData.instructions.length}/{VALIDATION_LIMITS.MODEL.INSTRUCTIONS_MAX_LENGTH}</span>
                </div>
              </div>

              <div className="space-y-2xs">
                <Label htmlFor="upload-tags">Tags</Label>
                <div className="flex gap-sm">
                  <Input
                    id="upload-tags"
                    value={form.tagInput}
                    onChange={(e) => form.setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder="Enter a tag and press Enter"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.addTag(form.tagInput)}
                    disabled={!form.tagInput.trim()}
                  >
                    Add
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="mt-2xs flex flex-wrap gap-2xs">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <button
                          type="button"
                          onClick={() => form.removeTag(tag)}
                          className="ml-2xs rounded-full hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                          aria-label={`Remove ${tag}`}
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Print metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-md">
              <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                <div className="space-y-2xs">
                  <Label htmlFor="upload-material">Material</Label>
                  <Input
                    id="upload-material"
                    value={formData.material}
                    onChange={(e) => setFormData((prev) => ({ ...prev, material: e.target.value }))}
                    placeholder="e.g. PLA, PETG, ABS"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2xs">
                  <Label htmlFor="upload-color">Color</Label>
                  <Input
                    id="upload-color"
                    value={formData.color}
                    onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                    placeholder="e.g. Black, White, Any"
                    maxLength={50}
                  />
                </div>
              </div>

              <fieldset className="space-y-2xs">
                <legend className="text-sm font-medium text-text-primary">Dimensions</legend>
                <div className="grid grid-cols-2 gap-sm md:grid-cols-4">
                  <div className="space-y-2xs">
                    <Label htmlFor="upload-dim-length">Length</Label>
                    <Input
                      id="upload-dim-length"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.dimensionsLength}
                      onChange={(e) => setFormData((prev) => ({ ...prev, dimensionsLength: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2xs">
                    <Label htmlFor="upload-dim-width">Width</Label>
                    <Input
                      id="upload-dim-width"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.dimensionsWidth}
                      onChange={(e) => setFormData((prev) => ({ ...prev, dimensionsWidth: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2xs">
                    <Label htmlFor="upload-dim-height">Height</Label>
                    <Input
                      id="upload-dim-height"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.dimensionsHeight}
                      onChange={(e) => setFormData((prev) => ({ ...prev, dimensionsHeight: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2xs">
                    <Label htmlFor="upload-dim-unit">Unit</Label>
                    <DropdownInput
                      as="select"
                      id="upload-dim-unit"
                      value={formData.dimensionsUnit}
                      onChange={(e) => setFormData((prev) => ({ ...prev, dimensionsUnit: e.target.value }))}
                    >
                      <option value="mm">mm</option>
                      <option value="cm">cm</option>
                      <option value="in">in</option>
                    </DropdownInput>
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-2xs">
                <legend className="text-sm font-medium text-text-primary">Print settings</legend>
                <div className="grid grid-cols-1 gap-sm md:grid-cols-3">
                  <div className="space-y-2xs">
                    <Label htmlFor="upload-layer-height">Layer height (mm)</Label>
                    <Input
                      id="upload-layer-height"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.layerHeight}
                      onChange={(e) => setFormData((prev) => ({ ...prev, layerHeight: e.target.value }))}
                      placeholder="e.g. 0.2"
                    />
                  </div>
                  <div className="space-y-2xs">
                    <Label htmlFor="upload-infill">Infill (%)</Label>
                    <Input
                      id="upload-infill"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={formData.infill}
                      onChange={(e) => setFormData((prev) => ({ ...prev, infill: e.target.value }))}
                      placeholder="e.g. 20"
                    />
                  </div>
                  <div className="space-y-2xs">
                    <Label htmlFor="upload-supports">Supports</Label>
                    <DropdownInput
                      as="select"
                      id="upload-supports"
                      value={formData.supports}
                      onChange={(e) => setFormData((prev) => ({ ...prev, supports: e.target.value }))}
                    >
                      <option value="">Not specified</option>
                      <option value="none">None</option>
                      <option value="buildplate_only">Build plate only</option>
                      <option value="everywhere">Everywhere</option>
                    </DropdownInput>
                  </div>
                </div>
              </fieldset>

              <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                <div className="space-y-2xs">
                  <Label htmlFor="upload-print-time">Estimated print time (minutes)</Label>
                  <Input
                    id="upload-print-time"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.estimatedPrintTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, estimatedPrintTime: e.target.value }))}
                    placeholder="e.g. 120"
                  />
                </div>
                <div className="space-y-2xs">
                  <Label htmlFor="upload-material-usage">Estimated material usage (grams)</Label>
                  <Input
                    id="upload-material-usage"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.estimatedMaterialUsage}
                    onChange={(e) => setFormData((prev) => ({ ...prev, estimatedMaterialUsage: e.target.value }))}
                    placeholder="e.g. 45"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => goTo(1)} disabled={saving}>Back</Button>
            <div className="flex gap-sm">
              <Button variant="ghost" onClick={saveAndExit} disabled={saving}>Save and exit</Button>
              <Button onClick={() => goTo(3)} disabled={saving}>{saving ? 'Saving…' : 'Continue'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4 — Compatibility */}
      {step === 3 && (
        <div className="space-y-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What does it fit?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-md">
              <p className="text-sm text-text-secondary">
                A spare part is found by the device it repairs: visitors browse brand, then product,
                then parts. Both are required to publish.
              </p>

              <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                <div className="space-y-2xs">
                  <Label htmlFor="upload-brand">Brand *</Label>
                  <Combobox
                    id="upload-brand"
                    placeholder={form.loadingMeta ? 'Loading brands…' : 'Search brands'}
                    options={form.brands.map((b) => ({ id: b.id, name: b.name }))}
                    searchTerm={form.brandSearch}
                    onSearchChange={form.setBrandSearch}
                    onSelect={(option) => {
                      setFormData((prev) => ({ ...prev, brandId: option.id, productIds: [] }))
                      form.setBrandSearch(option.name)
                    }}
                    isOpen={form.brandOpen}
                    onOpenChange={form.setBrandOpen}
                    disabled={form.loadingMeta}
                    emptyMessage={form.brandSearch ? 'No matching brands' : 'No brands found'}
                  />
                  <p className="text-sm text-text-secondary">
                    Brands are maintained by the registry. If yours is missing, send feedback.
                  </p>
                </div>

                <div className="space-y-2xs">
                  <Label htmlFor="upload-product">Compatible products *</Label>
                  <Combobox
                    id="upload-product"
                    // Brand comes first: products are scoped to it, and
                    // changing the brand clears the selection — so offering
                    // the picker before a brand exists would only invite
                    // choices the next click throws away.
                    placeholder={form.loadingProducts
                      ? 'Loading products…'
                      : !formData.brandId
                        ? 'Select a brand first'
                        : formData.productIds.length >= VALIDATION_LIMITS.MODEL.PRODUCTS_MAX_COUNT
                          ? `Maximum ${VALIDATION_LIMITS.MODEL.PRODUCTS_MAX_COUNT} products reached`
                          : 'Search and add a product'}
                    options={form.products
                      .filter((p) => !formData.productIds.includes(p.id))
                      .map((p) => ({ id: p.id, name: p.name, categoryId: p.category_id ?? '' }))}
                    searchTerm={form.productSearch}
                    onSearchChange={form.setProductSearch}
                    onSelect={(option) => form.addProduct(option.id)}
                    allowCreate={true}
                    onCreate={form.handleOpenCreateProduct}
                    createLabel={(value) => `Create product: ${value}`}
                    isOpen={form.productOpen}
                    onOpenChange={form.setProductOpen}
                    disabled={
                      form.loadingProducts ||
                      !formData.brandId ||
                      formData.productIds.length >= VALIDATION_LIMITS.MODEL.PRODUCTS_MAX_COUNT
                    }
                    emptyMessage={form.productSearch ? 'No matching products' : 'No products found'}
                  />
                  {formData.productIds.length > 0 && (
                    <div className="mt-2xs flex flex-wrap gap-2xs">
                      {formData.productIds.map((pid) => (
                        <Badge key={pid} variant="secondary">
                          {productNames[pid] ?? 'Product'}
                          <button
                            type="button"
                            onClick={() => form.removeProduct(pid)}
                            className="ml-2xs rounded-full hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                            aria-label={`Remove ${productNames[pid] ?? 'product'}`}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => goTo(2)} disabled={saving}>Back</Button>
            <div className="flex gap-sm">
              <Button variant="ghost" onClick={saveAndExit} disabled={saving}>Save and exit</Button>
              <Button onClick={() => goTo(4)} disabled={saving}>{saving ? 'Saving…' : 'Review'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 5 — Review and publish */}
      {step === 4 && draftSlug && (
        <div className="space-y-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Review — the page as it will appear</CardTitle>
            </CardHeader>
            <CardContent>
              <ModelDetails slug={draftSlug} />
            </CardContent>
          </Card>

          {publishBlockers.length > 0 && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-sm text-sm text-destructive">
              <p className="font-medium">Publication blocked:</p>
              <ul className="mt-2xs list-disc pl-md">
                {publishBlockers.map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => goTo(3)} disabled={saving || publishing}>Back</Button>
            <div className="flex gap-sm">
              <Button variant="ghost" onClick={saveAndExit} disabled={saving || publishing}>Save as draft</Button>
              <Button onClick={handlePublish} disabled={publishing || missingForPublish.length > 0}>
                {publishing ? 'Publishing…' : 'Publish'}
              </Button>
            </div>
          </div>
          {missingForPublish.length > 0 && (
            <p className="text-sm text-text-secondary">
              Still needed before publishing: {missingForPublish.join(' and ')}.
            </p>
          )}
        </div>
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
