'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const JUSTIFICATION_MAX_LENGTH = 1000

interface LegalReviewEscalationProps {
  needsLegalReview: boolean
  onNeedsLegalReviewChange: (value: boolean) => void
  justification: string
  onJustificationChange: (value: string) => void
  className?: string
}

/**
 * Manual escalation for an ambiguous or suspicious license (issue #302,
 * unchanged in meaning from the checklist step it used to sit on).
 *
 * It is blocking: the part stays saved but is never publishable while set, and
 * the justification is mandatory — enforced by the API and by a DB CHECK, not
 * only here.
 */
export function LegalReviewEscalation({
  needsLegalReview,
  onNeedsLegalReviewChange,
  justification,
  onJustificationChange,
  className,
}: LegalReviewEscalationProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Something looks wrong?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-sm">
        <div className="flex items-start gap-sm">
          <Checkbox
            id="needs-legal-review"
            checked={needsLegalReview}
            onCheckedChange={(checked) => onNeedsLegalReviewChange(checked === true)}
            className="mt-2xs"
          />
          <div className="space-y-2xs">
            <Label htmlFor="needs-legal-review" className="text-text-primary">
              Flag for legal review
            </Label>
            <p className="text-sm text-text-secondary">
              The declared license is ambiguous, or the context is suspicious. The part stays saved
              but cannot be published until it is cleared.
            </p>
          </div>
        </div>

        {needsLegalReview && (
          <div className="space-y-2xs">
            <Label htmlFor="legal-justification">Justification (required)</Label>
            <Textarea
              id="legal-justification"
              rows={3}
              value={justification}
              onChange={(e) => onJustificationChange(e.target.value)}
              placeholder="What is unclear about this part's license or origin?"
              maxLength={JUSTIFICATION_MAX_LENGTH}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
