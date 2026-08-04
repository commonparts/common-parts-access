'use client'

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CURATION_BLOCKING_CRITERIA } from '@/lib/curation/checklist'
import { CRITERION_STEP } from '@/lib/publish/placement'
import { PUBLISH_STEP_LABELS, type PublishStepIndex } from '@/lib/publish/steps'
import type { CurationChecklist } from '@/types/database'
import { cn } from '@/lib/utils'

interface ChecklistRollupProps {
  checklist: CurationChecklist
  /** Sends the contributor to the step that shows an unmet criterion. */
  onJumpTo: (step: PublishStepIndex) => void
  className?: string
}

/**
 * The Review-step roll-up of the six blocking criteria (issue #302).
 *
 * The criteria are now decided across the earlier steps, next to the evidence
 * each one judges. This is where they come back together, immediately above
 * the publish button: anything still unmet is named and linked to the step
 * that shows it, so a blocked publish is explained before the round trip. The
 * server-side gate remains the authority.
 */
export function ChecklistRollup({ checklist, onJumpTo, className }: ChecklistRollupProps) {
  const unmet = CURATION_BLOCKING_CRITERIA.filter((criterion) => checklist[criterion.key] !== true)

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Before publishing</CardTitle>
        {unmet.length === 0 ? (
          <Badge variant="soft">All checks confirmed</Badge>
        ) : (
          <Badge variant="outline">
            {unmet.length} of {CURATION_BLOCKING_CRITERIA.length} still to confirm
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-sm">
        {unmet.length === 0 ? (
          <p className="text-sm text-text-secondary">
            Every check is confirmed. Publishing runs the same checks again on the server.
          </p>
        ) : (
          <ul className="space-y-2xs">
            {unmet.map((criterion) => {
              const step = CRITERION_STEP[criterion.key]
              return (
                <li
                  key={criterion.key}
                  className={cn('flex flex-wrap items-center justify-between gap-2xs')}
                >
                  <span className="text-sm text-text-primary">{criterion.label}</span>
                  <Button variant="link" onClick={() => onJumpTo(step)}>
                    Go to {PUBLISH_STEP_LABELS[step]}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
