'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownInput } from '@/components/ui/dropdown-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Stepper } from '@/components/ui/stepper'
import { CreateProductModal } from '@/components/forms/create-product-modal'
import { DemandPanel } from '@/components/publish/demand-panel'
import { ChecklistRollup } from '@/components/publish/checklist-rollup'
import { CompatibilityStep } from '@/components/publish/compatibility-step'
import { DetailsStep } from '@/components/publish/details-step'
import { FilesStep } from '@/components/publish/files-step'
import { JudgementCheckbox } from '@/components/publish/judgement-checkbox'
import { LegalReviewEscalation } from '@/components/publish/legal-review-escalation'
import { RejectionRecorder } from '@/components/publish/rejection-recorder'
import { ReviewStep } from '@/components/publish/review-step'
import { StepNav } from '@/components/publish/step-nav'
import { useModelUploadFormState } from '@/hooks/use-model-upload-form-state'
import { uploadFilesFromClient } from '@/lib/storage/client-upload'
import {
  CURATION_BLOCKING_CRITERIA,
  CURATION_FLAGS,
  missingCriteria,
  type CurationFlagColumn,
} from '@/lib/curation/checklist'
import { elsewhereTrackBlockers } from '@/lib/publish/blockers'
import { FLAG_STEP } from '@/lib/publish/placement'
import {
  PUBLISH_STEPS,
  PUBLISH_STEP_LABELS,
  firstBlockedStep,
  type PublishStepIndex,
} from '@/lib/publish/steps'
import { isHostableLicense } from '@/lib/utils/licenses'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'
import { serializeModelMetadata } from '@/lib/utils/model-metadata'
import type {
  CurationChecklist,
  CurationCriterionKey,
  ModelFileHostingType,
} from '@/types/database'

const SOURCE_CHECK_DEBOUNCE_MS = 500

const PREFILLABLE_FIELDS = [
  'sourcePlatform',
  'originalAuthor',
  'originalAuthorUrl',
  'sourceLicenseId',
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

interface SourceDuplicate {
  id: string
  name: string
  slug: string
  status: string
}

interface ElsewhereTrackProps {
  /** Existing draft to resume, or null to start a new session. */
  draftId: string | null
  /** Called when the session ends (published, turned down, or saved). */
  onExit: () => void
}

const allFlagsUnconfirmed = (): Record<CurationFlagColumn, boolean> =>
  Object.fromEntries(CURATION_FLAGS.map((f) => [f.column, false])) as Record<
    CurationFlagColumn,
    boolean
  >

/** Formats a nullable number from the draft into a form input string. */
const numToStr = (value: number | null | undefined): string =>
  value === null || value === undefined ? '' : String(value)

/**
 * The elsewhere track (Flow P3, restructured in #302): publishing a part that
 * is already available on another platform, crediting its original author.
 *
 * Same five steps as the original track. The blocking checklist no longer has
 * a step of its own — each criterion is confirmed next to the evidence it
 * judges, and Review rolls them up above the publish button. Their definition,
 * their storage in `models.curation_checklist` and the server-side gate are
 * unchanged.
 */
export function ElsewhereTrack({ draftId: initialDraftId, onExit }: ElsewhereTrackProps) {
  const router = useRouter()
  const form = useModelUploadFormState()
  const { formData, setFormData } = form

  const [step, setStep] = React.useState<PublishStepIndex>(PUBLISH_STEPS.ORIGIN)
  const [draftId, setDraftId] = React.useState<string | null>(initialDraftId)
  const [draftSlug, setDraftSlug] = React.useState<string | null>(null)
  const [userId, setUserId] = React.useState<string | null>(null)
  const [hydrating, setHydrating] = React.useState(Boolean(initialDraftId))

  const [checklist, setChecklist] = React.useState<CurationChecklist>({})
  const [confirmedFlags, setConfirmedFlags] =
    React.useState<Record<CurationFlagColumn, boolean>>(allFlagsUnconfirmed)
  const [needsLegalReview, setNeedsLegalReview] = React.useState(false)
  const [legalJustification, setLegalJustification] = React.useState('')

  const [duplicate, setDuplicate] = React.useState<SourceDuplicate | null>(null)
  const [checkingSource, setCheckingSource] = React.useState(false)
  const [lastPrefill, setLastPrefill] = React.useState<PrefillValues | null>(null)

  const [modelFileCount, setModelFileCount] = React.useState(0)
  // Registered image URLs in canonical order (index 0 is the thumbnail).
  const [imageUrls, setImageUrls] = React.useState<string[]>([])
  const [uploadingFiles, setUploadingFiles] = React.useState(false)
  const [importingImages, setImportingImages] = React.useState(false)

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

  // Resume: hydrate everything, then open on the first step that still has an
  // unmet publish condition.
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
        const referenced = draft.file_hosting_type === 'link_out'
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
          fileHostingType: referenced ? 'link_out' : 'hosted',
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
        const hydratedChecklist: CurationChecklist = draft.curation_checklist ?? {}
        setChecklist(hydratedChecklist)
        setConfirmedFlags(
          Object.fromEntries(CURATION_FLAGS.map((f) => [f.column, draft[f.column] !== true])) as Record<
            CurationFlagColumn,
            boolean
          >,
        )
        setNeedsLegalReview(draft.needs_legal_review === true)
        setLegalJustification(draft.legal_review_justification ?? '')
        setModelFileCount(draft.model_file_count ?? 0)
        setImageUrls(
          Array.isArray(draft.images)
            ? draft.images.filter((url: unknown): url is string => typeof url === 'string')
            : [],
        )

        // Derived from the draft rather than from state, which has not
        // committed yet at this point in the effect. The publication license's
        // hostability is left unknown here — the license list may still be
        // loading, and an unknown must not manufacture a blocker.
        setStep(
          firstBlockedStep(
            elsewhereTrackBlockers({
              checklist: hydratedChecklist,
              referenced,
              sourcePlatform: draft.source_platform ?? '',
              licenseId: draft.license_id ?? '',
              publicationLicenseHostable: null,
              modelFileCount: draft.model_file_count ?? 0,
              productCount: Array.isArray(draft.product_ids) ? draft.product_ids.length : 0,
              needsLegalReview: draft.needs_legal_review === true,
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

  /**
   * Applies extracted values to fields not filled yet — pre-fill never
   * overwrites manual input. The raw response is kept so the "Pre-filled"
   * markers can be derived.
   */
  const applyPrefill = React.useCallback(
    (prefill: PrefillValues) => {
      setLastPrefill(prefill)
      setFormData((prev) => {
        const next = { ...prev }
        for (const field of PREFILLABLE_FIELDS) {
          const value = prefill[field]
          if (value && !prev[field].trim()) next[field] = value
        }
        // The publication license defaults to the declared source license —
        // any earlier licenseId value is just the form's arbitrary default,
        // never a deliberate choice (the Details step comes later).
        if (prefill.sourceLicenseId && next.sourceLicenseId === prefill.sourceLicenseId) {
          next.licenseId = prefill.sourceLicenseId
        }
        return next
      })
    },
    [setFormData],
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

  /**
   * Imports the source's gallery into the fresh draft (numbered 00-…, 01-… so
   * the source's first image becomes the thumbnail and the slideshow keeps the
   * source order). Fire-and-forget: a failed import is silent — photos can be
   * uploaded manually on the Files step.
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

  const patchDraftById = React.useCallback(
    async (id: string, body: Record<string, unknown>): Promise<boolean> => {
      const res = await fetch(`/api/curation/drafts/${id}`, {
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
    [],
  )

  const patchDraft = React.useCallback(
    async (body: Record<string, unknown>): Promise<boolean> => {
      if (!draftId) return false
      return patchDraftById(draftId, body)
    },
    [draftId, patchDraftById],
  )

  /**
   * The completeness flags a given step owns, in PATCH shape. Derived from the
   * placement map rather than restated per step, so a flag can never be shown
   * on one step and saved by another.
   */
  const flagPatchForStep = React.useCallback(
    (stepIndex: PublishStepIndex): Record<string, boolean> =>
      Object.fromEntries(
        CURATION_FLAGS.filter((f) => FLAG_STEP[f.column] === stepIndex).map((f) => [
          f.column,
          // The column records what is still missing, so it is the negation
          // of the contributor's positive confirmation.
          !confirmedFlags[f.column],
        ]),
      ),
    [confirmedFlags],
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
              sourcePlatform: formData.sourcePlatform,
              originalAuthor: formData.originalAuthor,
              originalAuthorUrl: formData.originalAuthorUrl,
              sourceLicenseId: formData.sourceLicenseId,
              fileHostingType: formData.fileHostingType,
              checklist,
              ...flagPatchForStep(PUBLISH_STEPS.ORIGIN),
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
          const newId: string = json.draft.id
          setDraftId(newId)
          setDraftSlug(json.draft.slug)
          // Kick off the source image import in the background — the Files
          // step shows the running state and the resulting count.
          if (formData.sourcePlatform === 'printables') {
            void importImagesFromSource(newId)
          }
          // Creation cannot carry the category or the judgements made on this
          // step — the endpoint's payload is the DB minimum for a curated row.
          // Flush them now so nothing decided before the draft existed is lost.
          return await patchDraftById(newId, {
            categoryId: formData.categoryId,
            checklist,
            ...flagPatchForStep(PUBLISH_STEPS.ORIGIN),
          })
        }

        if (stepIndex === PUBLISH_STEPS.FILES) {
          // Files register at upload time; only the judgements need saving.
          return await patchDraft({
            checklist,
            ...flagPatchForStep(PUBLISH_STEPS.FILES),
          })
        }

        if (stepIndex === PUBLISH_STEPS.DETAILS) {
          return await patchDraft({
            description: formData.description,
            instructions: formData.instructions,
            licenseId: formData.licenseId,
            tags: formData.tags,
            // The hosting outcome can flip at any point when the declared
            // license changes — persist it here too so the draft never drifts
            // from what the tool shows.
            fileHostingType: formData.fileHostingType,
            ...flagPatchForStep(PUBLISH_STEPS.DETAILS),
            ...serializeModelMetadata(formData),
          })
        }

        if (stepIndex === PUBLISH_STEPS.COMPATIBILITY) {
          return await patchDraft({
            brandId: formData.brandId ?? '',
            productIds: formData.productIds,
            checklist,
          })
        }

        if (stepIndex === PUBLISH_STEPS.REVIEW) {
          return await patchDraft({
            ...flagPatchForStep(PUBLISH_STEPS.REVIEW),
            needs_legal_review: needsLegalReview,
            legalReviewJustification: legalJustification,
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
    [
      draftId,
      formData,
      checklist,
      needsLegalReview,
      legalJustification,
      patchDraft,
      patchDraftById,
      flagPatchForStep,
      importImagesFromSource,
    ],
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
        // A referenced part never hosts model files — only photos are uploaded.
        modelFiles: formData.fileHostingType === 'link_out' ? [] : formData.files,
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
        setError(json.error || 'Failed to record the decision')
        return
      }
      setRejected(true)
    } catch {
      setError('Failed to record the decision')
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

  const toggleCriterion = (key: CurationCriterionKey, checked: boolean) =>
    setChecklist((prev) => ({ ...prev, [key]: checked }))

  const toggleFlag = (column: CurationFlagColumn, confirmed: boolean) =>
    setConfirmedFlags((prev) => ({ ...prev, [column]: confirmed }))

  /**
   * Switching back to hosting invalidates an NC/ND publication license — clear
   * it so the select never shows a value the filtered list would hide. Fails
   * closed: the selection survives only when the license is positively
   * confirmed hostable, so an unloaded list or a stale id also clears.
   */
  const changeHosting = (value: ModelFileHostingType) => {
    setFormData((prev) => {
      const next = { ...prev, fileHostingType: value }
      if (value === 'hosted' && prev.licenseId) {
        const license = form.licenses.find((l) => l.id === prev.licenseId)
        if (!license || !isHostableLicense(license)) next.licenseId = ''
      }
      return next
    })
  }

  // An NC/ND source license means the files cannot be hosted here at all.
  const sourceLicense = form.licenses.find((l) => l.id === formData.sourceLicenseId)
  const sourceLicenseForbidsHosting = Boolean(sourceLicense && !isHostableLicense(sourceLicense))
  const referenced = formData.fileHostingType === 'link_out'

  // Force referencing whenever the declared license forbids hosting — this
  // covers pre-fill, manual selection and resumed drafts alike, and re-runs
  // once the license list finishes loading so a pre-fill that lands first is
  // caught.
  React.useEffect(() => {
    if (sourceLicenseForbidsHosting && formData.fileHostingType === 'hosted') {
      setFormData((prev) => ({ ...prev, fileHostingType: 'link_out' }))
    }
  }, [sourceLicenseForbidsHosting, formData.fileHostingType, setFormData])

  const publicationLicense = form.licenses.find((l) => l.id === formData.licenseId)
  const blockers = elsewhereTrackBlockers({
    checklist,
    referenced,
    sourcePlatform: formData.sourcePlatform,
    licenseId: formData.licenseId,
    publicationLicenseHostable: publicationLicense ? isHostableLicense(publicationLicense) : null,
    modelFileCount,
    productCount: formData.productIds.length,
    needsLegalReview,
  })

  // Draft creation needs the DB minimum for a part from elsewhere.
  const originStepReady =
    formData.title.trim().length >= VALIDATION_LIMITS.MODEL.TITLE_MIN_LENGTH &&
    formData.sourceUrl.trim().length > 0 &&
    formData.originalAuthor.trim().length > 0 &&
    formData.sourceLicenseId.length > 0 &&
    (!referenced || formData.sourcePlatform.length > 0) &&
    !duplicate

  const criterion = (key: CurationCriterionKey) =>
    CURATION_BLOCKING_CRITERIA.find((c) => c.key === key)!

  const renderCriterion = (key: CurationCriterionKey, hint?: React.ReactNode) => {
    const def = criterion(key)
    return (
      <JudgementCheckbox
        id={`criterion-${key}`}
        label={def.label}
        description={def.description}
        checked={checklist[key] === true}
        onChange={(checked) => toggleCriterion(key, checked)}
        hint={hint}
      />
    )
  }

  /** Renders the completeness confirmations the given step owns. */
  const renderFlagsForStep = (stepIndex: PublishStepIndex) =>
    CURATION_FLAGS.filter((def) => FLAG_STEP[def.column] === stepIndex).map((def) => (
      <JudgementCheckbox
        key={def.column}
        id={`flag-${def.column}`}
        label={def.label}
        description={def.description}
        checked={confirmedFlags[def.column]}
        onChange={(checked) => toggleFlag(def.column, checked)}
      />
    ))

  if (hydrating) {
    return <p className="text-sm text-text-secondary">Loading your draft…</p>
  }

  if (rejected) {
    return (
      <Card>
        <CardContent className="space-y-sm pt-md">
          <p className="text-text-primary">Decision recorded for this source.</p>
          <p className="text-sm text-text-secondary">
            The reason and the unconfirmed checks are traced in the log. The draft, if one was
            created, remains available in your drafts.
          </p>
          <Button onClick={onExit}>Back to drafts</Button>
        </CardContent>
      </Card>
    )
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
                <Label htmlFor="elsewhere-source-url">Where is it published? *</Label>
                <Input
                  id="elsewhere-source-url"
                  type="url"
                  value={formData.sourceUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sourceUrl: e.target.value }))}
                  placeholder="https://www.printables.com/model/…"
                  disabled={Boolean(draftId)}
                  required
                />
                {checkingSource && (
                  <p className="text-sm text-text-secondary">Checking the registry…</p>
                )}
                {draftId && (
                  <p className="text-sm text-text-secondary">
                    The source is fixed once the draft exists.
                  </p>
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

              {renderCriterion(
                'duplicate',
                !duplicate && formData.sourceUrl.trim() && !checkingSource
                  ? 'The registry has no part with this source URL.'
                  : undefined,
              )}

              <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                <div className="space-y-2xs">
                  <Label htmlFor="elsewhere-title">Part title *</Label>
                  <Input
                    id="elsewhere-title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Dishwasher rack wheel clip"
                    maxLength={VALIDATION_LIMITS.MODEL.TITLE_MAX_LENGTH}
                    required
                  />
                </div>
                <div className="space-y-2xs">
                  <div className="flex items-center gap-2xs">
                    <Label htmlFor="elsewhere-platform">
                      Platform{referenced ? ' *' : ''}
                    </Label>
                    {prefilledFields.has('sourcePlatform') && (
                      <Badge variant="outline">Pre-filled</Badge>
                    )}
                  </div>
                  <DropdownInput
                    as="select"
                    id="elsewhere-platform"
                    value={formData.sourcePlatform}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, sourcePlatform: e.target.value }))
                    }
                    required={referenced}
                  >
                    <option value="">Select platform</option>
                    {form.sourcePlatforms.map((platform) => (
                      <option key={platform.slug} value={platform.slug}>
                        {platform.name}
                      </option>
                    ))}
                  </DropdownInput>
                </div>
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
                      disabled={form.loadingMeta}
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
                {renderFlagsForStep(PUBLISH_STEPS.ORIGIN)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Attribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-md">
              <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                <div className="space-y-2xs">
                  <div className="flex items-center gap-2xs">
                    <Label htmlFor="elsewhere-author">Original author *</Label>
                    {prefilledFields.has('originalAuthor') && (
                      <Badge variant="outline">Pre-filled</Badge>
                    )}
                  </div>
                  <Input
                    id="elsewhere-author"
                    value={formData.originalAuthor}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, originalAuthor: e.target.value }))
                    }
                    placeholder="Author name on the source platform"
                    required
                  />
                </div>
                <div className="space-y-2xs">
                  <div className="flex items-center gap-2xs">
                    <Label htmlFor="elsewhere-author-url">Author URL</Label>
                    {prefilledFields.has('originalAuthorUrl') && (
                      <Badge variant="outline">Pre-filled</Badge>
                    )}
                  </div>
                  <Input
                    id="elsewhere-author-url"
                    type="url"
                    value={formData.originalAuthorUrl}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, originalAuthorUrl: e.target.value }))
                    }
                    placeholder="https://…"
                  />
                </div>
              </div>
              {renderCriterion('attribution')}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">License and files</CardTitle>
            </CardHeader>
            <CardContent className="space-y-md">
              <div className="space-y-2xs">
                <div className="flex items-center gap-2xs">
                  <Label htmlFor="elsewhere-source-license">License declared at the source *</Label>
                  {prefilledFields.has('sourceLicenseId') && (
                    <Badge variant="outline">Pre-filled</Badge>
                  )}
                </div>
                <DropdownInput
                  as="select"
                  id="elsewhere-source-license"
                  // The publication license defaults to the declared license,
                  // but only while it still tracks it (or on the very first
                  // pick) — never clobber a publication license deliberately
                  // diverged from it on the Details step.
                  onChange={(e) =>
                    setFormData((prev) => {
                      const next = { ...prev, sourceLicenseId: e.target.value }
                      if (
                        e.target.value &&
                        (!prev.sourceLicenseId || prev.licenseId === prev.sourceLicenseId)
                      ) {
                        next.licenseId = e.target.value
                      }
                      return next
                    })
                  }
                  value={formData.sourceLicenseId}
                  required
                >
                  <option value="">Select the license declared at the source</option>
                  {form.licenses.map((license) => (
                    <option key={license.id} value={license.id}>
                      {license.shortName} — {license.name}
                    </option>
                  ))}
                </DropdownInput>
              </div>

              {/* Where the files end up is a consequence of the declared
                  license, not a control. Only the hostable case offers a
                  choice, and only in one direction. */}
              <div className="space-y-2xs rounded-md border border-border-subtle bg-bg-subtle p-sm">
                <p className="text-sm text-text-primary">
                  {referenced
                    ? sourceLicenseForbidsHosting
                      ? 'This license does not permit redistribution — Common Parts will link to the source.'
                      : 'Common Parts will link to the source; the files stay where they are published.'
                    : 'The files will be hosted on Common Parts.'}
                </p>
                {!sourceLicenseForbidsHosting && formData.sourceLicenseId && (
                  <>
                    {referenced ? (
                      <Button variant="link" onClick={() => changeHosting('hosted')}>
                        Host the files on Common Parts instead
                      </Button>
                    ) : (
                      <Button
                        variant="link"
                        onClick={() => changeHosting('link_out')}
                        disabled={!formData.sourcePlatform || modelFileCount > 0}
                      >
                        Reference it at the source instead
                      </Button>
                    )}
                    {!referenced && !formData.sourcePlatform && (
                      <p className="text-sm text-text-secondary">
                        To reference a part instead, name its platform above — the platform has to
                        match where the source URL points.
                      </p>
                    )}
                    {!referenced && modelFileCount > 0 && (
                      <p className="text-sm text-text-secondary">
                        Model files are already uploaded. A referenced part never hosts files, so
                        remove them first.
                      </p>
                    )}
                  </>
                )}
              </div>

              {renderCriterion('license')}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scope</CardTitle>
            </CardHeader>
            <CardContent>
              {renderCriterion(
                'eligibility',
                'A functional spare part for a real product — not a decoration, not a tool.',
              )}
            </CardContent>
          </Card>

          <RejectionRecorder
            reason={rejectReason}
            onReasonChange={setRejectReason}
            onRecord={handleReject}
            recording={rejecting}
            sourceUrl={formData.sourceUrl}
          />

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
            idPrefix="elsewhere"
            referenced={referenced}
            sourceUrl={formData.sourceUrl}
            modelFileCount={modelFileCount}
            imageUrls={imageUrls}
            uploading={uploadingFiles}
            uploadReady={Boolean(draftId && draftSlug && userId)}
            onUpload={handleUploadFiles}
            importingImages={importingImages}
            helpText="Open the files in a slicer before confirming the file check — whether they open is a human judgement."
            judgements={
              <>
                {renderCriterion('file')}
                {renderFlagsForStep(PUBLISH_STEPS.FILES)}
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
            licenseControl={
              <div className="space-y-2xs">
                <Label htmlFor="elsewhere-license">Publication license *</Label>
                <DropdownInput
                  as="select"
                  id="elsewhere-license"
                  value={formData.licenseId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, licenseId: e.target.value }))}
                  required
                >
                  <option value="">Select the license the part is published under</option>
                  {form.licenses
                    .filter((license) => referenced || isHostableLicense(license))
                    .map((license) => (
                      <option key={license.id} value={license.id}>
                        {license.shortName} — {license.name}
                      </option>
                    ))}
                </DropdownInput>
                <p className="text-sm text-text-secondary">
                  {referenced
                    ? 'This part is referenced at its source, so NC and ND licenses are allowed — the files are never hosted here.'
                    : 'Only licenses allowing commercial use and modification are offered — hosting the files here requires them.'}
                </p>
              </div>
            }
            flags={
              <div className="space-y-sm border-t border-border-subtle pt-md">
                {renderFlagsForStep(PUBLISH_STEPS.DETAILS)}
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
              <DemandPanel productIds={formData.productIds} productNames={productNames} />
            }
            judgements={renderCriterion('product_target')}
          />
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
        >
          <ChecklistRollup checklist={checklist} onJumpTo={goTo} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Print confirmation</CardTitle>
            </CardHeader>
            <CardContent>{renderFlagsForStep(PUBLISH_STEPS.REVIEW)}</CardContent>
          </Card>
          <LegalReviewEscalation
            needsLegalReview={needsLegalReview}
            onNeedsLegalReviewChange={setNeedsLegalReview}
            justification={legalJustification}
            onJustificationChange={setLegalJustification}
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
