'use client'

import * as React from 'react'
import Image from 'next/image'
import { Trash2 } from 'lucide-react'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmationDialog } from '@/components/common/confirmation-dialog'
import { ElsewhereTrack } from '@/components/publish/elsewhere-track'
import { OrientationQuestion } from '@/components/publish/orientation-question'
import { OriginalTrack } from '@/components/publish/original-track'
import { mergeDraftLists, type PublishDraft } from '@/lib/publish/drafts'
import { publishTrackDefinition, type PublishTrack } from '@/lib/publish/tracks'
import { formatRelativeTime } from '@/lib/utils/formatters'

type Session =
  | { mode: 'idle' }
  | { mode: 'new'; track: PublishTrack }
  | { mode: 'resume'; track: PublishTrack; draftId: string }

/**
 * The single entry point for publishing a part (issue #303).
 *
 * One orientation question routes a new session onto one of two tracks that
 * share the same five steps. The tracks are not merged behind it: each still
 * talks to its own engine, and the `origin_type` scoping on those endpoints is
 * what keeps either from touching the other's drafts.
 *
 * The landing state is the contributor's open drafts across both tracks,
 * merged client-side because the two list endpoints are scoped and neither can
 * see the other's rows.
 */
export default function PublishPage() {
  const [session, setSession] = React.useState<Session>({ mode: 'idle' })
  const [drafts, setDrafts] = React.useState<PublishDraft[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = React.useState<PublishDraft | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const loadDrafts = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [originalRes, elsewhereRes] = await Promise.all([
        fetch('/api/upload/drafts'),
        fetch('/api/curation/drafts'),
      ])
      const originalJson = await originalRes.json().catch(() => ({}))
      const elsewhereJson = await elsewhereRes.json().catch(() => ({}))

      if (!originalRes.ok || !elsewhereRes.ok) {
        setError(originalJson.error || elsewhereJson.error || 'Failed to load drafts')
        return
      }

      setDrafts(
        mergeDraftLists(
          Array.isArray(originalJson.drafts) ? originalJson.drafts : [],
          Array.isArray(elsewhereJson.drafts) ? elsewhereJson.drafts : [],
        ),
      )
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
  // endpoint, which removes the row and cleans up the stored files. For a
  // draft on the elsewhere track it also frees its source URL for a new one.
  const handleConfirmDelete = async () => {
    const target = pendingDelete
    if (!target) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/models/${encodeURIComponent(target.slug)}`, {
        method: 'DELETE',
      })
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
      title="Publish a part"
      description="Add a spare part to the Common Parts Index. Your progress is saved at every step, so you can stop and come back."
    >
      {session.mode === 'idle' && (
        <div className="space-y-lg">
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-sm text-sm text-destructive">
              {error}
            </div>
          )}

          <OrientationQuestion onChoose={(track) => setSession({ mode: 'new', track })} />

          <div className="space-y-md">
            <h2 className="text-lg font-medium text-text-primary">In progress</h2>

            {loading ? (
              <p className="text-sm text-text-secondary">Loading drafts…</p>
            ) : drafts.length === 0 ? (
              <Card>
                <CardContent className="pt-md">
                  <p className="text-sm text-text-secondary">
                    Nothing in progress. Answer the question above to start a part.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-sm">
                {drafts.map((draft) => (
                  <Card key={draft.id}>
                    <CardHeader className="flex flex-row items-center justify-between gap-sm space-y-0">
                      <CardTitle className="text-base">{draft.name}</CardTitle>
                      <Badge variant="outline">{publishTrackDefinition(draft.track).badge}</Badge>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-sm">
                      <div className="flex min-w-0 items-center gap-sm">
                        {draft.thumbnailUrl && (
                          <div className="relative h-2xl w-2xl shrink-0 overflow-hidden rounded-md border border-border-subtle bg-bg-subtle">
                            <Image
                              src={draft.thumbnailUrl}
                              alt=""
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          </div>
                        )}
                        <p className="min-w-0 truncate text-sm text-text-secondary">
                          {draft.updatedAt
                            ? `Last edited ${formatRelativeTime(draft.updatedAt)}`
                            : (draft.sourceUrl ?? 'Draft')}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2xs">
                        <Button
                          variant="secondary"
                          onClick={() =>
                            setSession({ mode: 'resume', track: draft.track, draftId: draft.id })
                          }
                        >
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
        </div>
      )}

      {session.mode !== 'idle' && session.track === 'original' && (
        <OriginalTrack
          draftId={session.mode === 'resume' ? session.draftId : null}
          onExit={exitSession}
        />
      )}

      {session.mode !== 'idle' && session.track === 'elsewhere' && (
        <ElsewhereTrack
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
