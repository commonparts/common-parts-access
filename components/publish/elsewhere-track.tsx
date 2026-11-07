'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Link, useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NativeSelect } from '@/components/ui/native-select'
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
import { usePartUploadFormState } from '@/hooks/use-part-upload-form-state'
import { StorageUploadError, uploadFilesFromClient } from '@/lib/storage/client-upload'
import { CURATION_FLAGS, missingCriteria, type CurationFlagColumn } from '@/lib/curation/checklist'
import { CURATED_FILE_HOSTING_TYPE } from '@/lib/curation/hosting'
import { shouldImportOnResume, supportsImageImport } from '@/lib/curation/image-import'
import { elsewhereTrackBlockers } from '@/lib/publish/blockers'
import { FLAG_STEP } from '@/lib/publish/placement'
import {
  PUBLISH_STEPS,
  PUBLISH_STEP_NAMES,
  firstBlockedStep,
  type PublishStepIndex,
} from '@/lib/publish/steps'
import { VALIDATION_LIMITS } from '@/lib/utils/constants'
import { serializePartMetadata } from '@/lib/utils/part-metadata'
import type { CurationChecklist, CurationCriterionKey } from '@/types/database'

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
  /** Source platforms the server can import a gallery from (#431). */
  imageImportPlatforms: readonly string[]
}

const allFlagsUnconfirmed = (): Record<CurationFlagColumn, boolean> =>
  Object.fromEntries(CURATION_FLAGS.map((column) => [column, false])) as Record<
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
  const criteria = useTranslations('CurationCriteria')
  const flags = useTranslations('CurationFlags')
  const router = useRouter()
  const form = usePartUploadFormState({ preselectFirstLicense: false })
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
  // Draft id the resume import was fired for — guards against a second fire
  // for the same resume (effect re-run, React strict mode).
  const resumeImportFiredFor = React.useRef<string | null>(null)

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
        setFormData((prev) => ({
          ...prev,
          title: draft.name ?? '',
          description: draft.description ?? '',
          instructions: draft.instructions ?? '',
          categoryId: draft.category_id ?? '',
          productIds: Array.isArray(draft.product_ids) ? draft.product_ids : [],
          licenseId: draft.license_id ?? '',
          tags: Array.isArray(draft.tags) ? draft.tags : [],
          originType: 'curated',
          sourceUrl: draft.source_url ?? '',
          sourcePlatform: draft.source_platform ?? '',
          originalAuthor: draft.original_author ?? '',
          originalAuthorUrl: draft.original_author_url ?? '',
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
          Object.fromEntries(CURATION_FLAGS.map((column) => [column, draft[column] !== true])) as Record<
            CurationFlagColumn,
            boolean
          >,
        )
        setNeedsLegalReview(draft.needs_legal_review === true)
        setLegalJustification(draft.legal_review_justification ?? '')
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

  const patchDraftById = React.useCallback(
    async (id: string, body: Record<string, unknown>): Promise<boolean> => {
      const res = await fetch(`/api/curation/drafts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error || flow('saveFailed'))
        return false
      }
      return true
    },
    [flow],
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
        CURATION_FLAGS.filter((column) => FLAG_STEP[column] === stepIndex).map((column) => [
          column,
          // The column records what is still missing, so it is the negation
          // of the contributor's positive confirmation.
          !confirmedFlags[column],
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
              licenseId: formData.licenseId,
              fileHostingType: CURATED_FILE_HOSTING_TYPE,
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
              licenseId: formData.licenseId,
              fileHostingType: CURATED_FILE_HOSTING_TYPE,
            }),
          })
          const json = await res.json().catch(() => ({}))
          if (!res.ok) {
            if (res.status === 409 && json.duplicate) setDuplicate(json.duplicate)
            setError(json.error || flow('createFailed'))
            return false
          }
          const newId: string = json.draft.id
          setDraftId(newId)
          setDraftSlug(json.draft.slug)
          // Kick off the source image import in the background — the Files
          // step shows the running state and the resulting count.
          if (supportsImageImport(formData.sourcePlatform, imageImportPlatforms)) {
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
            tags: formData.tags,
            ...flagPatchForStep(PUBLISH_STEPS.DETAILS),
            ...serializePartMetadata(formData),
          })
        }

        if (stepIndex === PUBLISH_STEPS.COMPATIBILITY) {
          return await patchDraft({
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
        setError(flow('saveFailed'))
        return false
      } finally {
        setSaving(false)
      }
    },
    [
      flow,
      draftId,
      formData,
      checklist,
      needsLegalReview,
      legalJustification,
      patchDraft,
      patchDraftById,
      flagPatchForStep,
      importImagesFromSource,
      imageImportPlatforms,
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
      setFormData((prev) => ({ ...prev, files: [], thumbnails: [] }))
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
      const saved = await saveStep(step)
      if (!saved) return

      const res = await fetch(`/api/curation/drafts/${draftId}/publish`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (Array.isArray(json.blockers)) setPublishBlockers(json.blockers)
        setError(json.error || flow('publishFailed'))
        return
      }
      router.push(`/parts/${json.slug}`)
    } catch {
      setError(flow('publishFailed'))
    } finally {
      setPublishing(false)
    }
  }

  const toggleCriterion = (key: CurationCriterionKey, checked: boolean) =>
    setChecklist((prev) => ({ ...prev, [key]: checked }))

  const toggleFlag = (column: CurationFlagColumn, confirmed: boolean) =>
    setConfirmedFlags((prev) => ({ ...prev, [column]: confirmed }))

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

  const renderCriterion = (key: CurationCriterionKey, hint?: React.ReactNode) => {
    return (
      <JudgementCheckbox
        id={`criterion-${key}`}
        label={criteria(`${key}.label`)}
        description={criteria(`${key}.description`)}
        checked={checklist[key] === true}
        onChange={(checked) => toggleCriterion(key, checked)}
        hint={hint}
      />
    )
  }

  /** Renders the completeness confirmations the given step owns. */
  const renderFlagsForStep = (stepIndex: PublishStepIndex) =>
    CURATION_FLAGS.filter((column) => FLAG_STEP[column] === stepIndex).map((column) => (
      <JudgementCheckbox
        key={column}
        id={`flag-${column}`}
        label={flags(`${column}.label`)}
        description={flags(`${column}.description`)}
        checked={confirmedFlags[column]}
        onChange={(checked) => toggleFlag(column, checked)}
      />
    ))

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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{steps('origin')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-md">
              <div className="space-y-2xs">
                <Label htmlFor="elsewhere-source-url">{t('sourceUrl')}</Label>
                <Input
                  id="elsewhere-source-url"
                  type="url"
                  value={formData.sourceUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sourceUrl: e.target.value }))}
                  placeholder={t('sourceUrlPlaceholder')}
                  disabled={Boolean(draftId)}
                  required
                />
                {checkingSource && <p className="text-sm text-text-secondary">{t('checkingSource')}</p>}
                {draftId && <p className="text-sm text-text-secondary">{t('sourceFixed')}</p>}
              </div>

              {duplicate && (
                <Alert>
                  {t.rich(duplicate.status === 'published' ? 'duplicatePublished' : 'duplicateDraft', {
                    name: duplicate.name,
                    part: (chunks) =>
                      duplicate.status === 'published' ? (
                        <Link href={`/parts/${duplicate.slug}`} className="font-medium underline">
                          {chunks}
                        </Link>
                      ) : (
                        <span className="font-medium">{chunks}</span>
                      ),
                  })}
                </Alert>
              )}

              {renderCriterion(
                'duplicate',
                !duplicate && formData.sourceUrl.trim() && !checkingSource
                  ? t('noDuplicate')
                  : undefined,
              )}

              <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                <div className="space-y-2xs">
                  <Label htmlFor="elsewhere-title">{flow('title')}</Label>
                  <Input
                    id="elsewhere-title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder={flow('titlePlaceholder')}
                    maxLength={VALIDATION_LIMITS.PART.TITLE_MAX_LENGTH}
                    required
                  />
                </div>
                <div className="space-y-2xs">
                  <div className="flex items-center gap-2xs">
                    <Label htmlFor="elsewhere-platform">{t('platform')}</Label>
                    {prefilledFields.has('sourcePlatform') && <Badge variant="outline">{flow('prefilled')}</Badge>}
                  </div>
                  <NativeSelect
                    id="elsewhere-platform"
                    value={formData.sourcePlatform}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, sourcePlatform: e.target.value }))
                    }
                    required
                  >
                    <option value="">{t('selectPlatform')}</option>
                    {form.sourcePlatforms.map((platform) => (
                      <option key={platform.slug} value={platform.slug}>
                        {platform.name}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              </div>

              <div className="space-y-2xs">
                <Label>{t('category')}</Label>
                <div className="grid grid-cols-1 gap-sm md:grid-cols-3">
                  {form.categoryLevels.map((level, idx) => (
                    <NativeSelect
                      key={level.parentId ?? `root-${idx}`}
                      value={form.categoryPath[idx] ?? ''}
                      onChange={(e) => form.handleCategorySelect(idx, e.target.value)}
                      disabled={form.loadingMeta}
                    >
                      <option value="">
                        {form.loadingMeta
                          ? flow('loadingCategories')
                          : idx === 0
                            ? flow('selectCategory')
                            : flow('refineCategory')}
                      </option>
                      {level.options.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </NativeSelect>
                  ))}
                </div>
                {renderFlagsForStep(PUBLISH_STEPS.ORIGIN)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('attribution')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-md">
              <div className="grid grid-cols-1 gap-md md:grid-cols-2">
                <div className="space-y-2xs">
                  <div className="flex items-center gap-2xs">
                    <Label htmlFor="elsewhere-author">{t('author')}</Label>
                    {prefilledFields.has('originalAuthor') && <Badge variant="outline">{flow('prefilled')}</Badge>}
                  </div>
                  <Input
                    id="elsewhere-author"
                    value={formData.originalAuthor}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, originalAuthor: e.target.value }))
                    }
                    placeholder={t('authorPlaceholder')}
                    required
                  />
                </div>
                <div className="space-y-2xs">
                  <div className="flex items-center gap-2xs">
                    <Label htmlFor="elsewhere-author-url">{t('authorUrl')}</Label>
                    {prefilledFields.has('originalAuthorUrl') && <Badge variant="outline">{flow('prefilled')}</Badge>}
                  </div>
                  <Input
                    id="elsewhere-author-url"
                    type="url"
                    value={formData.originalAuthorUrl}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, originalAuthorUrl: e.target.value }))
                    }
                    placeholder={t('authorUrlPlaceholder')}
                  />
                </div>
              </div>
              {renderCriterion('attribution')}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('licenseAndFiles')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-md">
              <div className="space-y-2xs">
                <div className="flex items-center gap-2xs">
                  <Label htmlFor="elsewhere-license">{t('license')}</Label>
                  {prefilledFields.has('licenseId') && <Badge variant="outline">{flow('prefilled')}</Badge>}
                </div>
                <NativeSelect
                  id="elsewhere-license"
                  value={formData.licenseId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, licenseId: e.target.value }))}
                  required
                >
                  <option value="">
                    {form.loadingMeta ? flow('loadingLicenses') : t('selectLicense')}
                  </option>
                  {form.licenses.map((license) => (
                    <option key={license.id} value={license.id}>
                      {flow('licenseOption', { shortName: license.shortName, name: license.name })}
                    </option>
                  ))}
                </NativeSelect>
                <p className="text-sm text-text-secondary">{t('licenseHint')}</p>
              </div>

              <div className="rounded-md border border-border-subtle bg-bg-subtle p-sm">
                <p className="text-sm text-text-primary">{t('linkOut')}</p>
              </div>

              {renderCriterion('license')}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('scope')}</CardTitle>
            </CardHeader>
            <CardContent>
              {renderCriterion('eligibility', t('eligibilityHint'))}
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
              <DemandPanel productIds={formData.productIds} productNames={form.productNames} />
            }
            judgements={renderCriterion('product_target')}
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
