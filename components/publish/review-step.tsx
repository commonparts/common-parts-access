'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ModelDetails } from '@/components/model/model-details'
import { PUBLISH_STEP_LABELS, type PublishBlocker, type PublishStepIndex } from '@/lib/publish/steps'

interface ReviewStepProps {
  /** The draft's slug — the preview renders the real part page against it. */
  slug: string
  /**
   * Unmet conditions mirrored locally, so a blocked publish is explained
   * before the round trip. The server-side gate stays the authority.
   */
  blockers: readonly PublishBlocker[]
  /** Blockers returned by the gate's 422, when one came back. */
  serverBlockers: readonly string[]
  publishing: boolean
  saving: boolean
  onBack: () => void
  onSaveAsDraft: () => void
  onPublish: () => void
  onJumpTo: (step: PublishStepIndex) => void
  /** Track-specific additions above the publish button. */
  children?: React.ReactNode
}

/**
 * The Review step, shared by both tracks (issue #302): the real part page
 * rendered against the draft, then publish or save for later.
 */
export function ReviewStep({
  slug,
  blockers,
  serverBlockers,
  publishing,
  saving,
  onBack,
  onSaveAsDraft,
  onPublish,
  onJumpTo,
  children,
}: ReviewStepProps) {
  return (
    <div className="space-y-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Review — the page as it will appear</CardTitle>
        </CardHeader>
        <CardContent>
          <ModelDetails slug={slug} />
        </CardContent>
      </Card>

      {children}

      {serverBlockers.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-sm text-sm text-destructive">
          <p className="font-medium">Publication blocked:</p>
          <ul className="mt-2xs list-disc pl-md">
            {serverBlockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        </div>
      )}

      {blockers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Still needed before publishing</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2xs">
              {blockers.map((blocker) => (
                <li
                  key={`${blocker.step}-${blocker.message}`}
                  className="flex flex-wrap items-center justify-between gap-2xs"
                >
                  <span className="text-sm text-text-primary">{blocker.message}</span>
                  <Button variant="link" onClick={() => onJumpTo(blocker.step)}>
                    Go to {PUBLISH_STEP_LABELS[blocker.step]}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={saving || publishing}>
          Back
        </Button>
        <div className="flex gap-sm">
          <Button variant="ghost" onClick={onSaveAsDraft} disabled={saving || publishing}>
            Save as draft
          </Button>
          <Button onClick={onPublish} disabled={publishing || saving || blockers.length > 0}>
            {publishing ? 'Publishing…' : 'Publish'}
          </Button>
        </div>
      </div>
    </div>
  )
}
