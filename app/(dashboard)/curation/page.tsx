'use client'

import * as React from 'react'
import { Trash2 } from 'lucide-react'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmationDialog } from '@/components/common/confirmation-dialog'
import { CurationTool } from '@/components/curation/curation-tool'
import { CURATION_BLOCKING_CRITERIA } from '@/lib/curation/checklist'
import type { CurationChecklist } from '@/types/database'

interface DraftListItem {
  id: string
  name: string
  slug: string
  source_url: string | null
  curation_checklist: CurationChecklist
  updated_at: string | null
}

type Session = { mode: 'idle' } | { mode: 'new' } | { mode: 'resume'; draftId: string }

function checkedCount(checklist: CurationChecklist): number {
  return CURATION_BLOCKING_CRITERIA.filter((c) => checklist?.[c.key] === true).length
}

/**
 * Internal curation tool (Flow P3): pick up an interrupted draft or start a
 * new guided session. Dashboard-protected; not linked from public navigation.
 */
export default function CurationPage() {
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
      const res = await fetch('/api/curation/drafts')
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
  // endpoint (row + storage cleanup). It also frees the unique source URL.
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
      title="Curation"
      description="Guided intake of external parts: checklist, entities, demand, files, review."
    >
      {session.mode === 'idle' && (
        <div className="space-y-md">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-text-primary">Open drafts</h2>
            <Button onClick={() => setSession({ mode: 'new' })}>Start a curation session</Button>
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
                  No open curation drafts. Start a session with a source URL — progress is saved at every step.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-sm">
              {drafts.map((draft) => (
                <Card key={draft.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-base">{draft.name}</CardTitle>
                    <Badge variant="outline">
                      {checkedCount(draft.curation_checklist)}/{CURATION_BLOCKING_CRITERIA.length} criteria
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between gap-sm">
                    <p className="min-w-0 truncate text-sm text-text-secondary">{draft.source_url}</p>
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
        <CurationTool
          draftId={session.mode === 'resume' ? session.draftId : null}
          onExit={exitSession}
        />
      )}

      <ConfirmationDialog
        open={pendingDelete !== null}
        title="Delete draft"
        description={`Are you sure you want to delete the draft "${pendingDelete?.name}"? Uploaded files are removed and the source URL becomes available for a new session. This action cannot be undone.`}
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
