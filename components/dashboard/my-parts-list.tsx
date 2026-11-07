'use client'

import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ConfirmationDialog } from '@/components/common/confirmation-dialog'
import { PartThumbnail } from '@/components/part/part-thumbnail'
import type { MyPartListItem } from '@/types/parts'

/** Rendered width of the square row thumbnail (the `2xl` spacing token, 64px). */
const THUMBNAIL_SIZES = '64px'

interface MyPartsListProps {
  initialParts: MyPartListItem[]
  hasNextPage: boolean
  currentPage: number
}

/**
 * Client component for the "My parts" dashboard.
 * Renders a paginated list of the user's published parts with per-row delete actions.
 * Deletion is confirmed via a modal dialog before the API call is made.
 */
export function MyPartsList({ initialParts, hasNextPage, currentPage }: MyPartsListProps) {
  const t = useTranslations('MyPartsList')
  const pagination = useTranslations('Pagination')
  const format = useFormatter()
  const [parts, setParts] = useState<MyPartListItem[]>(initialParts)
  const [pendingDelete, setPendingDelete] = useState<MyPartListItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleConfirmDelete() {
    const target = pendingDelete
    if (!target) return
    setDeleting(true)
    setDeleteError(null)

    try {
      const response = await fetch(`/api/parts/${target.slug}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const body = (await response.json()) as { error?: string }
        throw new Error(body.error || t('deleteFailed'))
      }

      let updatedCount = 0
      setParts((currentParts) => {
        const updatedParts = currentParts.filter((part) => part.id !== target.id)
        updatedCount = updatedParts.length
        return updatedParts
      })
      setPendingDelete(null)

      // Navigate to the previous page when deleting the last item on page > 1.
      if (updatedCount === 0 && currentPage > 1) {
        const url = new URL(window.location.href)
        url.searchParams.set('page', String(currentPage - 1))
        window.location.href = url.toString()
      }
    } catch (err) {
      setPendingDelete(null)
      setDeleteError(err instanceof Error ? err.message : t('deleteFailed'))
    } finally {
      setDeleting(false)
    }
  }

  if (parts.length === 0) {
    if (currentPage > 1) {
      return (
        <div className="space-y-md">
          <div className="rounded-lg border border-border-subtle bg-bg-surface p-lg text-sm text-text-secondary">
            {t('emptyPage')}
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
              {pagination('previous')}
            </Button>
            <span className="text-sm text-text-secondary">{t('page', { page: currentPage })}</span>
            <div />
          </div>
        </div>
      )
    }
    return (
      <div className="rounded-lg border border-border-subtle bg-bg-surface p-lg text-sm text-text-secondary">
        {t('empty')}
      </div>
    )
  }

  return (
    <>
      {deleteError && <Alert>{deleteError}</Alert>}

      <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle bg-bg-surface">
        {parts.map((part) => (
          <li
            key={part.id}
            className="flex items-center justify-between gap-md px-lg py-sm"
          >
            <div className="flex min-w-0 items-center gap-sm">
              <div className="relative size-2xl shrink-0 overflow-hidden rounded-md border border-border-subtle">
                <PartThumbnail
                  src={part.thumbnailUrl}
                  alt={part.name}
                  sizes={THUMBNAIL_SIZES}
                />
              </div>
              <div className="min-w-0 space-y-xs">
                <p className="truncate text-sm font-medium text-text-primary">{part.name}</p>
                <p className="text-xs text-text-secondary">
                  {part.createdAt
                    ? t('uploaded', { date: format.dateTime(new Date(part.createdAt), { dateStyle: 'medium' }) })
                    : t('uploadDateUnknown')}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('deletePart', { name: part.name })}
              onClick={() => setPendingDelete(part)}
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
            {pagination('previous')}
          </Button>
          <span className="text-sm text-text-secondary">{t('page', { page: currentPage })}</span>
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
            {pagination('next')}
          </Button>
        </div>
      )}

      <ConfirmationDialog
        open={pendingDelete !== null}
        title={t('deleteTitle')}
        description={t('deleteConfirm', { name: pendingDelete?.name ?? '' })}
        confirmLabel={t('delete')}
        loadingLabel={t('deleting')}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleting) setPendingDelete(null)
        }}
        loading={deleting}
      />
    </>
  )
}