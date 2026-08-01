'use client'

import * as React from 'react'
import Image from 'next/image'
import { Trash2 } from 'lucide-react'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmationDialog } from '@/components/common/confirmation-dialog'
import { UploadTool } from '@/components/upload/upload-tool'
import { formatRelativeTime } from '@/lib/utils/formatters'

interface DraftListItem {
  id: string
  name: string
  slug: string
  thumbnail_url: string | null
  updated_at: string | null
}

type Session = { mode: 'idle' } | { mode: 'new' } | { mode: 'resume'; draftId: string }

/**
 * Public upload flow (issue #293): publish an original part whose files this
 * registry hosts. Opens on the contributor's unfinished drafts so an
 * interrupted session can be picked up where it stopped.
 *
 * Parts already published on another platform do not belong here — they go
 * through the elsewhere track, which owns source attribution and the choice
 * between hosting the files and referencing them at the source.
 */
export default function UploadPage() {
  const [session, setSession] = React.useState<Session>({ mode: 'idle' })
  const [drafts, setDrafts] = React.useState<DraftListItem[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = React.useState<DraftListItem | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const loadDrafts = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/upload/drafts')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || 'Failed to load drafts')
        return
      }
      setDrafts(Array.isArray(json.drafts) ? json.drafts : [])
    } catch {
      setError('Failed to load drafts')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (session.mode === 'idle') {
      loadDrafts()
    }
  }, [session.mode, loadDrafts])

  const exitSession = React.useCallback(() => setSession({ mode: 'idle' }), [])

  // Drafts are models rows, so deletion reuses the owner-gated model delete
  // endpoint, which removes the row and cleans up the stored files.
  const handleConfirmDelete = async () => {
    const target = pendingDelete
    if (!target) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/models/${encodeURIComponent(target.slug)}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Delete failed. Please try again.')
      }
      setDrafts((current) => current.filter((draft) => draft.id !== target.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed. Please try again.')
    } finally {
      setPendingDelete(null)
      setDeleting(false)
    }
  }

  return (
    <DashboardShell
      title="Publish a part you designed"
      description="Publish your own design here for the first time. Common Parts hosts the files and keeps them downloadable."
    >
      {session.mode === 'idle' && (
        <div className="space-y-md">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-text-primary">Unfinished parts</h2>
            <Button onClick={() => setSession({ mode: 'new' })}>Start a new part</Button>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-sm text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-text-secondary">Loading drafts…</p>
          ) : drafts.length === 0 ? (
            <Card>
              <CardContent className="pt-md">
                <p className="text-sm text-text-secondary">
                  Nothing in progress. Start a part — your work is saved at every step, so you can
                  stop and come back.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-sm">
              {drafts.map((draft) => (
                <Card key={draft.id}>
                  <CardHeader className="space-y-0">
                    <CardTitle className="text-base">{draft.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-sm">
                    <div className="flex min-w-0 items-center gap-sm">
                      {draft.thumbnail_url && (
                        <div className="relative h-2xl w-2xl shrink-0 overflow-hidden rounded-md border border-border-subtle bg-bg-subtle">
                          <Image
                            src={draft.thumbnail_url}
                            alt=""
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </div>
                      )}
                      <p className="min-w-0 truncate text-sm text-text-secondary">
                        {draft.updated_at ? `Last edited ${formatRelativeTime(draft.updated_at)}` : 'Draft'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2xs">
                      <Button variant="secondary" onClick={() => setSession({ mode: 'resume', draftId: draft.id })}>
                        Resume
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${draft.name}`}
                        onClick={() => setPendingDelete(draft)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {session.mode !== 'idle' && (
        <UploadTool
          draftId={session.mode === 'resume' ? session.draftId : null}
          onExit={exitSession}
        />
      )}

      <ConfirmationDialog
        open={pendingDelete !== null}
        title="Delete draft"
        description={`Are you sure you want to delete the draft "${pendingDelete?.name}"? Any files you uploaded are removed. This action cannot be undone.`}
        confirmLabel="Delete"
        loadingLabel="Deleting…"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleting) setPendingDelete(null)
        }}
        loading={deleting}
      />
    </DashboardShell>
  )
}
