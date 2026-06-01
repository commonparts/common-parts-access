'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ModelUploadForm } from '@/components/forms/model-upload-form'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Grid } from '@/components/layout/grid'
import { uploadFilesFromClient, cleanupUploadedFiles, type UploadProgress } from '@/lib/storage/client-upload'
import type { ModelFormData } from '@/hooks/use-model-upload-form-state'

interface UploadIssue {
  field?: string
  message?: string
}

interface FileMetadata {
  name: string
  size: number
}

interface DimensionsMetadata {
  unit: string
  length?: number
  width?: number
  height?: number
}

interface PrintSettingsMetadata {
  layer_height?: number
  infill?: number
  supports?: string
}

interface CreateModelMetadataPayload {
  title: string
  description: string
  category: string
  license_id: string
  isPublic: boolean
  origin_type: string
  verification_status: string
  tags: string[]
  modelFiles: FileMetadata[]
  thumbnails: FileMetadata[]
  brand?: string
  product_ids?: string[]
  source_url?: string
  source_platform?: string
  original_author?: string
  original_author_url?: string
  source_license_id?: string
  material?: string
  color?: string
  dimensions?: string
  print_settings?: string
  estimated_print_time?: string
  estimated_material_usage?: string
}

interface CreateModelSuccessResponse {
  modelId: string
  slug: string
  userId: string
  intendedStatus: string
}

interface UploadErrorResponse {
  error?: string
  issues?: UploadIssue[]
}

function isCreateModelSuccessResponse(data: unknown): data is CreateModelSuccessResponse {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return false
  const obj = data as Record<string, unknown>
  return (
    typeof obj.modelId === 'string' &&
    typeof obj.slug === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.intendedStatus === 'string'
  )
}

export default function UploadPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [issues, setIssues] = useState<UploadIssue[]>([])
  const [progressText, setProgressText] = useState<string | null>(null)

  /**
   * Three-phase upload:
   * 1. Send metadata (no files) to the API to create the model record.
   * 2. Upload files directly to Supabase Storage from the browser.
   * 3. Register the uploaded files via a second API call.
   *
   * This bypasses the Vercel 4.5 MB serverless body-size limit by never
   * sending file bytes through the API route.
   */
  const handleSubmit = async (payload: ModelFormData) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    setIssues([])
    setProgressText('Creating model record…')

    try {
      // --- Build metadata payload (no file bytes) ---
      const metadata: CreateModelMetadataPayload = {
        title: payload.title,
        description: payload.description || '',
        category: payload.categoryId,
        license_id: payload.licenseId || '',
        isPublic: Boolean(payload.isPublic),
        origin_type: payload.originType || 'original',
        verification_status: payload.verificationStatus || 'unverified',
        tags: payload.tags || [],
        // File metadata for server-side validation (names/sizes only)
        modelFiles: payload.files.map((f) => ({ name: f.name, size: f.size })),
        thumbnails: payload.thumbnails.map((f) => ({ name: f.name, size: f.size })),
      }

      if (payload.brandId) metadata.brand = payload.brandId
      if (payload.productIds.length > 0) metadata.product_ids = payload.productIds
      if (payload.sourceUrl) metadata.source_url = payload.sourceUrl
      if (payload.sourcePlatform) metadata.source_platform = payload.sourcePlatform
      if (payload.originalAuthor) metadata.original_author = payload.originalAuthor
      if (payload.originalAuthorUrl) metadata.original_author_url = payload.originalAuthorUrl
      if (payload.sourceLicenseId) metadata.source_license_id = payload.sourceLicenseId
      if (payload.material) metadata.material = payload.material
      if (payload.color) metadata.color = payload.color

      if (payload.estimatedPrintTime !== '' && payload.estimatedPrintTime != null) {
        metadata.estimated_print_time = payload.estimatedPrintTime
      }
      if (payload.estimatedMaterialUsage !== '' && payload.estimatedMaterialUsage != null) {
        metadata.estimated_material_usage = payload.estimatedMaterialUsage
      }

      const hasDimensions =
        (payload.dimensionsLength != null && payload.dimensionsLength !== '') ||
        (payload.dimensionsWidth != null && payload.dimensionsWidth !== '') ||
        (payload.dimensionsHeight != null && payload.dimensionsHeight !== '')
      if (hasDimensions) {
        const dimensions: DimensionsMetadata = { unit: payload.dimensionsUnit || 'mm' }
        if (payload.dimensionsLength != null && payload.dimensionsLength !== '') {
          dimensions.length = parseFloat(payload.dimensionsLength)
        }
        if (payload.dimensionsWidth != null && payload.dimensionsWidth !== '') {
          dimensions.width = parseFloat(payload.dimensionsWidth)
        }
        if (payload.dimensionsHeight != null && payload.dimensionsHeight !== '') {
          dimensions.height = parseFloat(payload.dimensionsHeight)
        }
        metadata.dimensions = JSON.stringify(dimensions)
      }

      const hasPrintSettings =
        (payload.layerHeight != null && payload.layerHeight !== '') ||
        (payload.infill != null && payload.infill !== '') ||
        (payload.supports != null && payload.supports !== '')
      if (hasPrintSettings) {
        const settings: PrintSettingsMetadata = {}
        if (payload.layerHeight != null && payload.layerHeight !== '') {
          settings.layer_height = parseFloat(payload.layerHeight)
        }
        if (payload.infill != null && payload.infill !== '') {
          settings.infill = parseFloat(payload.infill)
        }
        if (payload.supports != null && payload.supports !== '') {
          settings.supports = payload.supports
        }
        metadata.print_settings = JSON.stringify(settings)
      }

      // --- Phase 1: Create model record ---
      const createResponse = await fetch('/api/models/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata),
      })
      const createData: unknown = await createResponse.json().catch(() => ({}))

      if (!createResponse.ok) {
        const errorData = createData as UploadErrorResponse
        setError(errorData.error || 'Failed to create model record')
        setIssues(Array.isArray(errorData.issues) ? errorData.issues : [])
        return
      }

      if (!isCreateModelSuccessResponse(createData)) {
        setError('Invalid response from server — missing model data')
        return
      }

      const { modelId, slug, userId, intendedStatus } = createData

      // --- Phase 2: Upload files directly to Supabase Storage ---
      setProgressText('Uploading files…')

      const handleProgress = (progress: UploadProgress) => {
        setProgressText(
          `Uploading ${progress.fileName} (${progress.current}/${progress.total})…`,
        )
      }

      const uploads = await uploadFilesFromClient({
        userId,
        modelId,
        modelFiles: payload.files,
        thumbnails: payload.thumbnails,
        onProgress: handleProgress,
      })

      // --- Phase 3: Register uploaded files ---
      setProgressText('Finalizing upload…')

      const allFiles = [...uploads.modelFiles, ...uploads.thumbnails]
      const registerResponse = await fetch(`/api/models/${encodeURIComponent(slug)}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: allFiles, intendedStatus }),
      })
      const registerData: UploadErrorResponse = await registerResponse
        .json()
        .catch((): UploadErrorResponse => ({}))

      if (!registerResponse.ok) {
        // Best-effort cleanup of orphaned storage files
        try {
          await cleanupUploadedFiles(allFiles)
        } catch (cleanupError) {
          console.error('Failed to clean up orphaned files after registration failure', cleanupError)
        }

        setError(registerData?.error || 'Failed to register uploaded files')
        return
      }

      setSuccess('Model uploaded successfully')
      if (slug) {
        const params = new URLSearchParams({ slug })
        router.push(`/upload/success?${params.toString()}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed — please try again')
    } finally {
      setLoading(false)
      setProgressText(null)
    }
  }

  return (
    <DashboardShell
      title="Upload a new model"
      description="Share verified, printable parts with the community."
    >
      <Grid columns={12}>
        <div className="col-span-12 space-y-md">
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-md text-sm text-destructive">
              {error}
              {issues.length > 0 && (
                <ul className="mt-xs list-disc space-y-1 pl-md">
                  {issues.map((issue, idx) => (
                    <li key={`${issue.field}-${idx}`}>{issue.message || 'Invalid field'}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-400/50 bg-emerald-50 p-md text-sm text-emerald-800">
              {success}
            </div>
          )}

          <ModelUploadForm onSubmit={handleSubmit} loading={loading} />
          {progressText && loading && (
            <p className="text-sm text-text-secondary">{progressText}</p>
          )}
        </div>
      </Grid>
    </DashboardShell>
  )
}