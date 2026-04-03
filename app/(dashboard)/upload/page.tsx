'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ModelUploadForm } from '@/components/forms/model-upload-form'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Grid } from '@/components/layout/grid'

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

  const handleSubmit = async (payload: any) => {
    setLoading(true)
    setError(null)
    setSuccess(null)
    setIssues([])

    const body = new FormData()
    body.append('title', payload.title)
    body.append('description', payload.description || '')
    body.append('category', payload.categoryId)
    body.append('license_id', payload.licenseId || '')
    body.append('isPublic', String(Boolean(payload.isPublic)))
    if (payload.brandId) body.append('brand', payload.brandId)
    if (payload.productId) body.append('product', payload.productId)

    // Attribution & License
    body.append('origin_type', payload.originType || 'original')
    if (payload.sourceUrl) body.append('source_url', payload.sourceUrl)
    if (payload.sourcePlatform) body.append('source_platform', payload.sourcePlatform)
    if (payload.originalAuthor) body.append('original_author', payload.originalAuthor)
    if (payload.originalAuthorUrl) body.append('original_author_url', payload.originalAuthorUrl)
    if (payload.sourceLicenseId) body.append('source_license_id', payload.sourceLicenseId)
    body.append('verification_status', payload.verificationStatus || 'unverified')

    // Advanced — print metadata
    if (payload.material) body.append('material', payload.material)
    if (payload.color) body.append('color', payload.color)
    if (payload.estimatedPrintTime) body.append('estimated_print_time', payload.estimatedPrintTime)
    if (payload.estimatedMaterialUsage) body.append('estimated_material_usage', payload.estimatedMaterialUsage)

    const hasDimensions = payload.dimensionsLength || payload.dimensionsWidth || payload.dimensionsHeight
    if (hasDimensions) {
      const dimensions = {
        length: payload.dimensionsLength ? parseFloat(payload.dimensionsLength) : undefined,
        width: payload.dimensionsWidth ? parseFloat(payload.dimensionsWidth) : undefined,
        height: payload.dimensionsHeight ? parseFloat(payload.dimensionsHeight) : undefined,
        unit: payload.dimensionsUnit || 'mm',
      }
      body.append('dimensions', JSON.stringify(dimensions))
    }

    const hasPrintSettings = payload.layerHeight || payload.infill || payload.supports
    if (hasPrintSettings) {
      const printSettings: Record<string, unknown> = {}
      if (payload.layerHeight) printSettings.layer_height = parseFloat(payload.layerHeight)
      if (payload.infill) printSettings.infill = parseFloat(payload.infill)
      if (payload.supports) printSettings.supports = payload.supports
      body.append('print_settings', JSON.stringify(printSettings))
    }

    for (const tag of payload.tags || []) {
      body.append('tags', tag)
    }
    for (const file of payload.files || []) {
      body.append('files', file)
    }
    for (const thumb of payload.thumbnails || []) {
      body.append('thumbnails', thumb)
    }

    try {
      const response = await fetch('/api/models/upload', {
        method: 'POST',
        body,
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        setError(data?.error || 'Upload failed')
        setIssues(Array.isArray(data?.issues) ? data.issues : [])
        return
      }

      setSuccess('Model uploaded successfully')
      if (data?.slug) {
        const params = new URLSearchParams({ slug: data.slug })
        router.push(`/upload/success?${params.toString()}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLoading(false)
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
        </div>
      </Grid>
    </DashboardShell>
  )
}