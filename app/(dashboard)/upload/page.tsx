'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ModelUploadForm } from '@/components/forms/model-upload-form'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Grid } from '@/components/layout/grid'
import { uploadFilesFromClient, type UploadProgress } from '@/lib/storage/client-upload'

interface UploadIssue {
  field?: string
  message?: string
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
  const handleSubmit = async (payload: {
    title: string
    description: string
    categoryId: string
    tags: string[]
    brandId?: string
    productId?: string
    files: File[]
    thumbnails: File[]
    isPublic: boolean
    licenseId: string
    originType: string
    sourceUrl: string
    sourcePlatform: string
    originalAuthor: string
    originalAuthorUrl: string
    sourceLicenseId: string
    verificationStatus: string
    material: string
    color: string
    dimensionsLength: string
    dimensionsWidth: string
    dimensionsHeight: string
    dimensionsUnit: string
    layerHeight: string
    infill: string
    supports: string
    estimatedPrintTime: string
    estimatedMaterialUsage: string
  }) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    setIssues([])
    setProgressText('Creating model record…')

    try {
      // --- Build metadata payload (no file bytes) ---
      const metadata: Record<string, unknown> = {
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
      if (payload.productId) metadata.product = payload.productId
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
        const dimensions: Record<string, unknown> = { unit: payload.dimensionsUnit || 'mm' }
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
        const settings: Record<string, unknown> = {}
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
      const createData = await createResponse.json().catch(() => ({}))

      if (!createResponse.ok) {
        setError(createData?.error || 'Failed to create model record')
        setIssues(Array.isArray(createData?.issues) ? createData.issues : [])
        return
      }

      const { modelId, slug, userId } = createData as {
        modelId: string
        slug: string
        userId: string
      }

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
        body: JSON.stringify({ files: allFiles }),
      })
      const registerData = await registerResponse.json().catch(() => ({}))

      if (!registerResponse.ok) {
        // Clean up orphaned storage files since registration failed
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const grouped = allFiles.reduce<Record<string, string[]>>((acc, f) => {
          acc[f.bucket] = acc[f.bucket] || []
          acc[f.bucket].push(f.path)
          return acc
        }, {})
        await Promise.all(
          Object.entries(grouped).map(([bucket, paths]) =>
            supabase.storage.from(bucket).remove(paths),
          ),
        )

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