'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmationDialog } from '@/components/common/confirmation-dialog'
import { formatDate } from '@/lib/utils/formatters'
import type { MyModelListItem } from '@/types/models'

interface MyModelsListProps {
  initialModels: MyModelListItem[]
  hasNextPage: boolean
  currentPage: number
}

/**
 * Client component for the "My Models" dashboard.
 * Renders a paginated list of the user's published parts with per-row delete actions.
 * Deletion is confirmed via a modal dialog before the API call is made.
 */
export function MyModelsList({ initialModels, hasNextPage, currentPage }: MyModelsListProps) {
  const [models, setModels] = useState<MyModelListItem[]>(initialModels)
  const [pendingDelete, setPendingDelete] = useState<MyModelListItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleConfirmDelete() {
    const target = pendingDelete
    if (!target) return
    setDeleting(true)
    setDeleteError(null)

    try {
      const response = await fetch(`/api/models/${target.slug}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const body = await response.json() as { error?: string }
        throw new Error(body.error || 'Delete failed. Please try again.')
      }

      const updated = models.filter(m => m.id !== target.id)
      setModels(updated)
      setPendingDelete(null)

      // Navigate to the previous page when deleting the last item on page > 1.
      if (updated.length === 0 && currentPage > 1) {
        const url = new URL(window.location.href)
        url.searchParams.set('page', String(currentPage - 1))
        window.location.href = url.toString()
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setDeleting(false)
    }
  }

  if (models.length === 0) {
    if (currentPage > 1) {
      return (
        <div className="space-y-md">
          <div className="rounded-lg border border-border-subtle bg-bg-surface p-lg text-sm text-text-secondary">
            No published parts on this page.
          </div>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const url = new URL(window.location.href)
                url.searchParams.set('page', String(currentPage - 1))
                window.location.href = url.toString()
              }}
            >
              Previous
            </Button>
            <span className="text-sm text-text-secondary">Page {currentPage}</span>
            <div />
          </div>
        </div>
      )
    }
    return (
      <div className="rounded-lg border border-border-subtle bg-bg-surface p-lg text-sm text-text-secondary">
        You have no published parts yet.
      </div>
    )
  }

  return (
    <>
      {deleteError && (
        <p role="alert" className="rounded-lg border border-border-default bg-bg-subtle p-sm text-sm text-text-primary">
          {deleteError}
        </p>
      )}

      <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-bg-surface">
        {models.map(model => (
          <li
            key={model.id}
            className="flex items-center justify-between gap-md px-lg py-sm"
          >
            <div className="min-w-0 space-y-xs">
              <p className="truncate text-sm font-medium text-text-primary">{model.name}</p>
              <p className="text-xs text-text-secondary">
                {model.createdAt ? `Uploaded ${formatDate(model.createdAt, 'medium')}` : 'Upload date unknown'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete ${model.name}`}
              onClick={() => setPendingDelete(model)}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>

      {(currentPage > 1 || hasNextPage) && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => {
              const url = new URL(window.location.href)
              url.searchParams.set('page', String(currentPage - 1))
              window.location.href = url.toString()
            }}
          >
            Previous
          </Button>
          <span className="text-sm text-text-secondary">Page {currentPage}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNextPage}
            onClick={() => {
              const url = new URL(window.location.href)
              url.searchParams.set('page', String(currentPage + 1))
              window.location.href = url.toString()
            }}
          >
            Next
          </Button>
        </div>
      )}

      <ConfirmationDialog
        open={pendingDelete !== null}
        title="Delete part"
        description={`Are you sure you want to delete "${pendingDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleting) setPendingDelete(null)
        }}
        loading={deleting}
      />
    </>
  )
}
