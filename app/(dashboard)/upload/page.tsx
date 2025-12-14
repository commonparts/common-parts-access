'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ModelUploadForm } from '@/components/forms/model-upload-form'

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
    body.append('license', payload.license || '')
    body.append('isPublic', String(Boolean(payload.isPublic)))
    if (payload.brandId) body.append('brand', payload.brandId)
    if (payload.productId) body.append('product', payload.productId)
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
    <div className="max-w-5xl mx-auto space-y-4 p-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Upload a new model</h1>
        <p className="text-sm text-muted-foreground">Share verified, printable parts with the community.</p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
          {issues.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {issues.map((issue, idx) => (
                <li key={`${issue.field}-${idx}`}>{issue.message || 'Invalid field'}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-emerald-400/50 bg-emerald-50 p-3 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <ModelUploadForm onSubmit={handleSubmit} loading={loading} />
    </div>
  )
}