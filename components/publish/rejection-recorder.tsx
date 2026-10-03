'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

const REASON_MAX_LENGTH = 1000

interface RejectionRecorderProps {
  reason: string
  onReasonChange: (value: string) => void
  onRecord: () => void
  recording: boolean
  /** A rejection is traced against the source, so a URL is required. */
  sourceUrl: string
  className?: string
}

/**
 * Records why a part from elsewhere was turned down, traced against its source
 * URL (`POST /api/curation/rejections`) independently of any draft row.
 *
 * Rendered from the Origin step onward (issue #302). The dedicated Checklist
 * step it used to live on is gone, but the property that mattered is not: a
 * part that should not be in the registry can be identified and recorded in
 * two minutes, without walking the whole flow first.
 */
export function RejectionRecorder({
  reason,
  onReasonChange,
  onRecord,
  recording,
  sourceUrl,
  className,
}: RejectionRecorderProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Not a fit?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-sm">
        <p className="text-sm text-text-secondary">
          If this part cannot meet one of the checks, record why. Anything left unconfirmed is traced
          automatically, so the decision stays reviewable.
        </p>
        <Textarea
          rows={2}
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Why is this part turned down?"
          maxLength={REASON_MAX_LENGTH}
          aria-label="Reason for turning down this part"
        />
        <Button
          variant="outline"
          onClick={onRecord}
          disabled={recording || !reason.trim() || !sourceUrl.trim()}
        >
          {recording ? 'Recording…' : 'Record and stop'}
        </Button>
      </CardContent>
    </Card>
  )
}
