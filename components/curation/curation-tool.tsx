'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Combobox } from '@/components/ui/combobox'
import { DropdownInput } from '@/components/ui/dropdown-input'
import { FileUploader } from '@/components/ui/file-uploader'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CreateProductModal } from '@/components/forms/create-product-modal'
import { ModelDetails } from '@/components/model/model-details'
import { BlockingChecklist } from '@/components/curation/blocking-checklist'
import { FlagsPanel } from '@/components/curation/flags-panel'
import { DemandPanel } from '@/components/curation/demand-panel'
import { useModelUploadFormState } from '@/hooks/use-model-upload-form-state'
import { uploadFilesFromClient } from '@/lib/storage/client-upload'
import { isChecklistComplete, missingCriteria, CURATION_FLAGS, type CurationFlagColumn } from '@/lib/curation/checklist'
import { FILE_TYPES } from '@/constants/app'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'
import { serializeModelMetadata } from '@/lib/utils/model-metadata'
import type { CurationChecklist, CurationCriterionKey, ModelFileHostingType } from '@/types/database'

const STEP_LABELS = ['Source', 'Checklist', 'Details', 'Flags & files', 'Review'] as const
const SOURCE_CHECK_DEBOUNCE_MS = 500

const PREFILLABLE_FIELDS = ['sourcePlatform', 'originalAuthor', 'originalAuthorUrl', 'sourceLicenseId'] as const
type PrefillableField = (typeof PREFILLABLE_FIELDS)[number]

/** Shape returned by GET /api/curation/prefill — null means not extractable. */
type CurationPrefillValues = Record<PrefillableField, string | null>

interface SourceDuplicate {
  id: string
  name: string
  slug: string
  status: string
}

interface CurationToolProps {
  /** Existing draft to resume, or null to start a new session. */
  draftId: string | null
  /** Called when the session ends (published, rejected, or saved for later). */
  onExit: () => void
}

const allFlagsUnconfirmed = (): Record<CurationFlagColumn, boolean> =>
  Object.fromEntries(CURATION_FLAGS.map((f) => [f.column, false])) as Record<CurationFlagColumn, boolean>

/** Formats a nullable number from the draft into a form input string. */
const numToStr = (value: number | null | undefined): string =>
  value === null || value === undefined ? '' : String(value)

interface HostingSelectProps {
  id: string
  value: ModelFileHostingType
  onChange: (value: ModelFileHostingType) => void
}

/**
 * File-hosting choice (hosted vs link-out). Rendered on the source step AND
 * the details step: the choice gates the license list, and a resumed session
 * starts past the source step, so it must stay reachable where licenses are
 * picked. Both instances bind the same form field.
 */
function HostingSelect({ id, value, onChange }: HostingSelectProps) {
  return (
    <div className="space-y-2xs">
      <Label htmlFor={id}>File hosting *</Label>
      <DropdownInput
        as="select"
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as ModelFileHostingType)}
        required
      >
        <option value="hosted">Host files here — whitelist licenses only (no NC/ND)</option>
        <option value="link_out">Link out to the source — NC/ND licenses allowed</option>
      </DropdownInput>
      <p className="text-sm text-text-secondary">
        {value === 'link_out'
          ? 'Files stay on the source platform; the source platform (source step) is required and its domain must match the source URL.'
          : 'Hosting requires a license that allows commercial use and redistribution.'}
      </p>
    </div>
  )
}

/**
 * Guided curation session (Flow P3): source intake with duplicate check,
 * blocking checklist, entity assignment with demand context, non-blocking
 * flags, file upload, and a review screen rendering the real part page.
 * Every step transition persists to the draft so an interrupted session
 * loses nothing.
 */
export function CurationTool({ draftId: initialDraftId, onExit }: CurationToolProps) {
  const router = useRouter()
  const form = useModelUploadFormState()
  const { formData, setFormData } = form

  const [step, setStep] = React.useState(0)
  const [draftId, setDraftId] = React.useState<string | null>(initialDraftId)
  const [draftSlug, setDraftSlug] = React.useState<string | null>(null)
  const [userId, setUserId] = React.useState<string | null>(null)
  const [hydrating, setHydrating] = React.useState(Boolean(initialDraftId))

  const [checklist, setChecklist] = React.useState<CurationChecklist>({})
  const [confirmedFlags, setConfirmedFlags] = React.useState<Record<CurationFlagColumn, boolean>>(allFlagsUnconfirmed)
  const [needsLegalReview, setNeedsLegalReview] = React.useState(false)
  const [legalJustification, setLegalJustification] = React.useState('')

  const [duplicate, setDuplicate] = React.useState<SourceDuplicate | null>(null)
  const [checkingSource, setCheckingSource] = React.useState(false)
  const [lastPrefill, setLastPrefill] = React.useState<CurationPrefillValues | null>(null)

  const [modelFileCount, setModelFileCount] = React.useState(0)
  const [imageFileCount, setImageFileCount] = React.useState(0)
  const [uploadingFiles, setUploadingFiles] = React.useState(false)

  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

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

  // Resume: hydrate form + curation state from the persisted draft.
  React.useEffect(() => {
    if (!initialDraftId) return
    let cancelled = false

    async function hydrate() {
      try {
        const res = await fetch(`/api/curation/drafts/${initialDraftId}`)
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
          originType: 'curated',
          sourceUrl: draft.source_url ?? '',
          sourcePlatform: draft.source_platform ?? '',
          originalAuthor: draft.original_author ?? '',
          originalAuthorUrl: draft.original_author_url ?? '',
          sourceLicenseId: draft.source_license_id ?? '',
          fileHostingType: draft.file_hosting_type === 'link_out' ? 'link_out' : 'hosted',
          // Metadata: the draft stores dimensions/print_settings as objects and
          // the estimates as numbers; the form holds each as a flat string.
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
        setChecklist(draft.curation_checklist ?? {})
        setConfirmedFlags(
          Object.fromEntries(
            CURATION_FLAGS.map((f) => [f.column, draft[f.column] !== true]),
          ) as Record<CurationFlagColumn, boolean>,
        )
        setNeedsLegalReview(draft.needs_legal_review === true)
        setLegalJustification(draft.legal_review_justification ?? '')
        setModelFileCount(draft.model_file_count ?? 0)
        setImageFileCount(draft.image_file_count ?? 0)
        setStep(1)
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

  /**
   * Applies extracted values to fields the curator has not filled yet —
   * pre-fill never overwrites manual input. The raw response is kept so the
   * "Pre-filled" markers can be derived (see isPrefilled).
   */
  const applyPrefill = React.useCallback(
    (prefill: CurationPrefillValues) => {
      setLastPrefill(prefill)
      setFormData((prev) => {
        const next = { ...prev }
        for (const field of PREFILLABLE_FIELDS) {
          const value = prefill[field]
          if (value && !prev[field].trim()) next[field] = value
        }
        return next
      })
    },
    [setFormData],
  )

  /**
   * A field is marked pre-filled while its value still matches what was
   * extracted from the source — editing it makes the marker disappear
   * without any extra bookkeeping.
   */
  const isPrefilled = (field: PrefillableField): boolean =>
    Boolean(lastPrefill?.[field]) && formData[field] === lastPrefill?.[field]

  // Immediate duplicate check + best-effort pre-fill on source_url while
  // typing (new sessions only — a resumed draft already owns its URL).
  // Pre-fill failure is silent by design: the flow never blocks on it.
  React.useEffect(() => {
    if (draftId || !formData.sourceUrl.trim()) {
      setDuplicate(null)
      setLastPrefill(null)
      // An in-flight check was cancelled by the cleanup below, so its
      // finally block will not reset the indicator — do it here.
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

  const patchDraft = React.useCallback(
    async (body: Record<string, unknown>): Promise<boolean> => {
      if (!draftId) return false
      const res = await fetch(`/api/curation/drafts/${draftId}`, {
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
              sourcePlatform: formData.sourcePlatform,
              originalAuthor: formData.originalAuthor,
              originalAuthorUrl: formData.originalAuthorUrl,
              sourceLicenseId: formData.sourceLicenseId,
              fileHostingType: formData.fileHostingType,
            })
          }
          const res = await fetch('/api/curation/drafts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: formData.title,
              sourceUrl: formData.sourceUrl,
              sourcePlatform: formData.sourcePlatform,
              originalAuthor: formData.originalAuthor,
              originalAuthorUrl: formData.originalAuthorUrl,
              sourceLicenseId: formData.sourceLicenseId,
              fileHostingType: formData.fileHostingType,
            }),
          })
          const json = await res.json().catch(() => ({}))
          if (!res.ok) {
            if (res.status === 409 && json.duplicate) setDuplicate(json.duplicate)
            setError(json.error || 'Failed to create the draft')
            return false
          }
          setDraftId(json.draft.id)
          setDraftSlug(json.draft.slug)
          return true
        }

        if (stepIndex === 1) {
          return await patchDraft({
            checklist,
            needs_legal_review: needsLegalReview,
            legalReviewJustification: legalJustification,
          })
        }

        if (stepIndex === 2) {
          return await patchDraft({
            title: formData.title,
            description: formData.description,
            instructions: formData.instructions,
            categoryId: formData.categoryId,
            brandId: formData.brandId ?? '',
            licenseId: formData.licenseId,
            tags: formData.tags,
            productIds: formData.productIds,
            // The hosting selector is editable on this step too (a resumed
            // session never passes through the source step).
            fileHostingType: formData.fileHostingType,
            ...serializeModelMetadata(formData),
          })
        }

        if (stepIndex === 3) {
          return await patchDraft(
            Object.fromEntries(CURATION_FLAGS.map((f) => [f.column, !confirmedFlags[f.column]])),
          )
        }

        return true
      } catch {
        setError('Failed to save the draft')
        return false
      } finally {
        setSaving(false)
      }
    },
    [draftId, formData, checklist, needsLegalReview, legalJustification, confirmedFlags, patchDraft],
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
        // Link-out parts never host model files — only photos are uploaded.
        modelFiles: formData.fileHostingType === 'link_out' ? [] : formData.files,
        thumbnails: formData.thumbnails,
      })
      const allFiles = [...uploads.modelFiles, ...uploads.thumbnails]
      const res = await fetch(`/api/models/${encodeURIComponent(draftSlug)}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: allFiles }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error || 'Failed to register uploaded files')
        return
      }
      setModelFileCount((count) => count + uploads.modelFiles.length)
      setImageFileCount((count) => count + uploads.thumbnails.length)
      setFormData((prev) => ({ ...prev, files: [], thumbnails: [] }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'File upload failed')
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
        setError(json.error || 'Failed to record the rejection')
        return
      }
      setRejected(true)
    } catch {
      setError('Failed to record the rejection')
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
      const saved = await saveStep(step)
      if (!saved) return

      const res = await fetch(`/api/curation/drafts/${draftId}/publish`, { method: 'POST' })
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

  const productNames = React.useMemo(
    () => Object.fromEntries(form.products.map((p) => [p.id, p.name])),
    [form.products],
  )

  // Switching back to hosted invalidates an NC/ND license selection — clear
  // it so the select never shows a value the whitelist filter would hide.
  // Fails closed: the selection is kept only when the license is positively
  // confirmed whitelisted, so an unloaded list or stale id also clears.
  const handleHostingChange = (value: ModelFileHostingType) => {
    setFormData((prev) => {
      const next = { ...prev, fileHostingType: value }
      if (value === 'hosted' && prev.licenseId) {
        const license = form.licenses.find((l) => l.id === prev.licenseId)
        if (!license || !license.allowsCommercial || !license.allowsRedistribution) {
          next.licenseId = ''
        }
      }
      return next
    })
  }

  const checklistComplete = isChecklistComplete(checklist)
  const isLinkOut = formData.fileHostingType === 'link_out'
  const sourceStepReady =
    formData.title.trim().length >= 3 &&
    formData.sourceUrl.trim().length > 0 &&
    formData.originalAuthor.trim().length > 0 &&
    formData.sourceLicenseId.length > 0 &&
    (!isLinkOut || formData.sourcePlatform.length > 0) &&
    !duplicate

  if (hydrating) {
    return <p className="text-sm text-text-secondary">Loading curation session…</p>
  }

  if (rejected) {
    return (
      <Card>
        <CardContent className="space-y-sm pt-md">
          <p className="text-text-primary">Rejection recorded for this source.</p>
          <p className="text-sm text-text-secondary">
            The reason and failed criteria are traced in the rejection log. The draft, if one was created, remains available in your drafts.
          </p>
          <Button onClick={onExit}>Back to curation</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-md">
      {/* Stepper */}
      <nav aria-label="Curation steps" className="flex flex-wrap items-center gap-sm">
        {STEP_LABELS.map((label, index) => (
          <React.Fragment key={label}>
            {index > 0 && <span className="text-text-disabled">→</span>}
            <Badge variant={index === step ? 'default' : index < step ? 'secondary' : 'outline'}>
              {index + 1}. {label}
            </Badge>
          </React.Fragment>
        ))}
      </nav>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-sm text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Step 1 — Source */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-md">
            <div className="space-y-2xs">
              <Label htmlFor="curation-source-url">Source URL *</Label>
              <Input
                id="curation-source-url"
                type="url"
                value={formData.sourceUrl}
                onChange={(e) => setFormData((prev) => ({ ...prev, sourceUrl: e.target.value }))}
                placeholder="https://www.printables.com/model/…"
                disabled={Boolean(draftId)}
                required
              />
              {checkingSource && <p className="text-sm text-text-secondary">Checking for duplicates…</p>}
              {draftId && (
                <p className="text-sm text-text-secondary">The source URL is fixed once the draft exists.</p>
              )}
            </div>

            {duplicate && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-sm text-sm text-destructive">
                This source is already in the registry:{' '}
                {duplicate.status === 'published' ? (
                  <Link href={`/parts/${duplicate.slug}`} className="font-medium underline">
                    {duplicate.name}
                  </Link>
                ) : (
                  <span className="font-medium">{duplicate.name} (draft)</span>
                )}
                . A second record cannot be created.
              </div>
            )}

            <div className="grid grid-cols-1 gap-md md:grid-cols-2">
              <div className="space-y-2xs">
                <Label htmlFor="curation-title">Part title *</Label>
                <Input
                  id="curation-title"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Dishwasher rack wheel clip"
                  required
                />
              </div>
              <div className="space-y-2xs">
                <div className="flex items-center gap-2xs">
                  <Label htmlFor="curation-platform">Source platform{isLinkOut ? ' *' : ''}</Label>
                  {isPrefilled('sourcePlatform') && <Badge variant="outline">Pre-filled</Badge>}
                </div>
                <DropdownInput
                  as="select"
                  id="curation-platform"
                  value={formData.sourcePlatform}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sourcePlatform: e.target.value }))}
                  required={isLinkOut}
                >
                  <option value="">Select platform</option>
                  {form.sourcePlatforms.map((platform) => (
                    <option key={platform.slug} value={platform.slug}>{platform.name}</option>
                  ))}
                </DropdownInput>
              </div>
              <div className="md:col-span-2">
                <HostingSelect
                  id="curation-hosting"
                  value={formData.fileHostingType}
                  onChange={handleHostingChange}
                />
              </div>
              <div className="space-y-2xs">
                <div className="flex items-center gap-2xs">
                  <Label htmlFor="curation-author">Original author *</Label>
                  {isPrefilled('originalAuthor') && <Badge variant="outline">Pre-filled</Badge>}
                </div>
                <Input
                  id="curation-author"
                  value={formData.originalAuthor}
                  onChange={(e) => setFormData((prev) => ({ ...prev, originalAuthor: e.target.value }))}
                  placeholder="Author name on the source platform"
                  required
                />
              </div>
              <div className="space-y-2xs">
                <div className="flex items-center gap-2xs">
                  <Label htmlFor="curation-author-url">Author URL</Label>
                  {isPrefilled('originalAuthorUrl') && <Badge variant="outline">Pre-filled</Badge>}
                </div>
                <Input
                  id="curation-author-url"
                  type="url"
                  value={formData.originalAuthorUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, originalAuthorUrl: e.target.value }))}
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-2xs md:col-span-2">
                <div className="flex items-center gap-2xs">
                  <Label htmlFor="curation-source-license">Declared source license *</Label>
                  {isPrefilled('sourceLicenseId') && <Badge variant="outline">Pre-filled</Badge>}
                </div>
                <DropdownInput
                  as="select"
                  id="curation-source-license"
                  value={formData.sourceLicenseId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sourceLicenseId: e.target.value }))}
                  required
                >
                  <option value="">Select the license declared at the source</option>
                  {form.licenses.map((license) => (
                    <option key={license.id} value={license.id}>{license.shortName} — {license.name}</option>
                  ))}
                </DropdownInput>
              </div>
            </div>

            <div className="flex justify-between pt-sm">
              <Button variant="outline" onClick={onExit}>Exit</Button>
              <Button onClick={() => goTo(1)} disabled={!sourceStepReady || saving}>
                {saving ? 'Saving…' : draftId ? 'Save and continue' : 'Create draft and continue'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Blocking checklist */}
      {step === 1 && (
        <div className="space-y-md">
          <BlockingChecklist
            checklist={checklist}
            onToggle={(key: CurationCriterionKey, checked) =>
              setChecklist((prev) => ({ ...prev, [key]: checked }))
            }
            needsLegalReview={needsLegalReview}
            onNeedsLegalReviewChange={setNeedsLegalReview}
            legalJustification={legalJustification}
            onLegalJustificationChange={setLegalJustification}
          />

          {!checklistComplete && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Reject this source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-sm">
                <p className="text-sm text-text-secondary">
                  If a blocking criterion cannot be met, record the rejection with its reason. Unchecked criteria are traced automatically.
                </p>
                <Textarea
                  rows={2}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Why is this source rejected?"
                  maxLength={1000}
                />
                <Button
                  variant="outline"
                  onClick={handleReject}
                  disabled={rejecting || !rejectReason.trim() || !formData.sourceUrl.trim()}
                >
                  {rejecting ? 'Recording…' : 'Record rejection'}
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => goTo(0)} disabled={saving}>Back</Button>
            <div className="flex gap-sm">
              <Button variant="ghost" onClick={saveAndExit} disabled={saving}>Save and exit</Button>
              <Button onClick={() => goTo(2)} disabled={saving || (needsLegalReview && !legalJustification.trim())}>
                {saving ? 'Saving…' : 'Continue'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — Details and entity assignment */}
      {step === 2 && (
        <div className="space-y-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Part details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-md">
              <div className="space-y-2xs">
                <Label htmlFor="curation-description">Description</Label>
                <Textarea
                  id="curation-description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="What the part is and what it fixes"
                />
              </div>
              <div className="space-y-2xs">
                <Label htmlFor="curation-instructions">Instructions</Label>
                <Textarea
                  id="curation-instructions"
                  rows={3}
                  value={formData.instructions}
                  onChange={(e) => setFormData((prev) => ({ ...prev, instructions: e.target.value }))}
                  placeholder="Installation or replacement instructions"
                />
              </div>

              <div className="space-y-2xs">
                <Label>Category</Label>
                <div className="grid grid-cols-1 gap-sm md:grid-cols-3">
                  {form.categoryLevels.map((level, idx) => (
                    <DropdownInput
                      as="select"
                      key={level.parentId ?? `root-${idx}`}
                      value={form.categoryPath[idx] ?? ''}
                      onChange={(e) => form.handleCategorySelect(idx, e.target.value)}
                    >
                      <option value="">{idx === 0 ? 'Select category' : 'Refine (optional)'}</option>
                      {level.options.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </DropdownInput>
                  ))}
                </div>
              </div>

              <HostingSelect
                id="curation-hosting-details"
                value={formData.fileHostingType}
                onChange={handleHostingChange}
              />

              <div className="space-y-2xs">
                <Label htmlFor="curation-license">Publication license *</Label>
                <DropdownInput
                  as="select"
                  id="curation-license"
                  value={formData.licenseId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, licenseId: e.target.value }))}
                  required
                >
                  <option value="">Select the license the part is published under</option>
                  {form.licenses
                    .filter((license) => isLinkOut || (license.allowsCommercial && license.allowsRedistribution))
                    .map((license) => (
                      <option key={license.id} value={license.id}>{license.shortName} — {license.name}</option>
                    ))}
                </DropdownInput>
                <p className="text-sm text-text-secondary">
                  {isLinkOut
                    ? 'Link-out part: NC/ND licenses are allowed — the files are never hosted here.'
                    : 'Only whitelist licenses (no NC/ND) are offered — hosting requires them.'}
                </p>
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
                  <Label htmlFor="curation-material">Material</Label>
                  <Input
                    id="curation-material"
                    value={formData.material}
                    onChange={(e) => setFormData((prev) => ({ ...prev, material: e.target.value }))}
                    placeholder="e.g. PLA, PETG, ABS"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2xs">
                  <Label htmlFor="curation-color">Color</Label>
                  <Input
                    id="curation-color"
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
                    <Label htmlFor="curation-dim-length">Length</Label>
                    <Input
                      id="curation-dim-length"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.dimensionsLength}
                      onChange={(e) => setFormData((prev) => ({ ...prev, dimensionsLength: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2xs">
                    <Label htmlFor="curation-dim-width">Width</Label>
                    <Input
                      id="curation-dim-width"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.dimensionsWidth}
                      onChange={(e) => setFormData((prev) => ({ ...prev, dimensionsWidth: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2xs">
                    <Label htmlFor="curation-dim-height">Height</Label>
                    <Input
                      id="curation-dim-height"
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.dimensionsHeight}
                      onChange={(e) => setFormData((prev) => ({ ...prev, dimensionsHeight: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2xs">
                    <Label htmlFor="curation-dim-unit">Unit</Label>
                    <DropdownInput
                      as="select"
                      id="curation-dim-unit"
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
                    <Label htmlFor="curation-layer-height">Layer height (mm)</Label>
                    <Input
                      id="curation-layer-height"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.layerHeight}
                      onChange={(e) => setFormData((prev) => ({ ...prev, layerHeight: e.target.value }))}
                      placeholder="e.g. 0.2"
                    />
                  </div>
                  <div className="space-y-2xs">
                    <Label htmlFor="curation-infill">Infill (%)</Label>
                    <Input
                      id="curation-infill"
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
                    <Label htmlFor="curation-supports">Supports</Label>
                    <DropdownInput
                      as="select"
                      id="curation-supports"
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
                  <Label htmlFor="curation-print-time">Estimated print time (minutes)</Label>
                  <Input
                    id="curation-print-time"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.estimatedPrintTime}
                    onChange={(e) => setFormData((prev) => ({ ...prev, estimatedPrintTime: e.target.value }))}
                    placeholder="e.g. 120"
                  />
                </div>
                <div className="space-y-2xs">
                  <Label htmlFor="curation-material-usage">Estimated material usage (grams)</Label>
                  <Input
                    id="curation-material-usage"
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Entity assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-md">
              <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                <div className="space-y-2xs">
                  <Label htmlFor="curation-brand">Brand</Label>
                  <Combobox
                    id="curation-brand"
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
                  <p className="text-sm text-text-secondary">Brands are curated in the database — creation is not available here.</p>
                </div>

                <div className="space-y-2xs">
                  <Label htmlFor="curation-product">Compatible products</Label>
                  <Combobox
                    id="curation-product"
                    placeholder={form.loadingProducts
                      ? 'Loading products…'
                      : formData.productIds.length >= VALIDATION_LIMITS.MODEL.PRODUCTS_MAX_COUNT
                        ? `Maximum ${VALIDATION_LIMITS.MODEL.PRODUCTS_MAX_COUNT} products reached`
                        : (!formData.brandId && !formData.categoryId)
                          ? 'Select brand or category first'
                          : 'Search and add a product'}
                    options={form.products
                      .filter((p) => !formData.productIds.includes(p.id))
                      .map((p) => ({ id: p.id, name: p.name, categoryId: p.category_id ?? '' }))}
                    searchTerm={form.productSearch}
                    onSearchChange={form.setProductSearch}
                    onSelect={(option) => {
                      form.addProduct(option.id)
                      form.setCategoryPathFromCategoryId((option as { categoryId?: string }).categoryId)
                    }}
                    allowCreate={true}
                    onCreate={form.handleOpenCreateProduct}
                    createLabel={(value) => `Create product: ${value}`}
                    isOpen={form.productOpen}
                    onOpenChange={form.setProductOpen}
                    disabled={
                      form.loadingProducts ||
                      formData.productIds.length >= VALIDATION_LIMITS.MODEL.PRODUCTS_MAX_COUNT ||
                      (!formData.brandId && !formData.categoryId)
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

              <DemandPanel productIds={formData.productIds} productNames={productNames} />
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

      {/* Step 4 — Non-blocking flags and files */}
      {step === 3 && (
        <div className="space-y-md">
          <FlagsPanel
            confirmed={confirmedFlags}
            onToggle={(column, isConfirmed) =>
              setConfirmedFlags((prev) => ({ ...prev, [column]: isConfirmed }))
            }
          />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Files</CardTitle>
              <div className="flex gap-2xs">
                {!isLinkOut && (
                  <Badge variant={modelFileCount > 0 ? 'secondary' : 'outline'}>
                    {modelFileCount} model {modelFileCount === 1 ? 'file' : 'files'}
                  </Badge>
                )}
                <Badge variant="outline">{imageFileCount} {imageFileCount === 1 ? 'image' : 'images'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-md">
              <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                {isLinkOut ? (
                  <div className="space-y-2xs">
                    <Label>Model files</Label>
                    <p className="rounded-md border border-border-subtle bg-bg-subtle p-sm text-sm text-text-secondary">
                      Link-out part: the model files stay on the source platform and are never uploaded here. Verify at the source that they open correctly.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2xs">
                    <Label>Model files (STL / 3MF / STEP)</Label>
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
                )}
                <div className="space-y-2xs">
                  <Label>Photos / thumbnails</Label>
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
              <div className="flex items-center gap-sm">
                <Button
                  onClick={handleUploadFiles}
                  disabled={uploadingFiles || (formData.files.length === 0 && formData.thumbnails.length === 0)}
                >
                  {uploadingFiles ? 'Uploading…' : 'Upload selected files'}
                </Button>
                <p className="text-sm text-text-secondary">
                  Open the files in a slicer before checking the file criterion — the open-ability check stays a human judgment.
                </p>
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
              <Button onClick={handlePublish} disabled={publishing || !checklistComplete || needsLegalReview}>
                {publishing ? 'Publishing…' : 'Publish'}
              </Button>
            </div>
          </div>
          {(!checklistComplete || needsLegalReview) && (
            <p className="text-sm text-text-secondary">
              {needsLegalReview
                ? 'This part is flagged for legal review and cannot be published.'
                : 'All blocking criteria must be checked before publishing.'}
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
