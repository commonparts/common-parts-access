'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { CURATION_BLOCKING_CRITERIA, missingCriteria } from '@/lib/curation/checklist'
import type { CurationChecklist, CurationCriterionKey } from '@/types/database'

interface BlockingChecklistProps {
  checklist: CurationChecklist
  onToggle: (key: CurationCriterionKey, checked: boolean) => void
  needsLegalReview: boolean
  onNeedsLegalReviewChange: (value: boolean) => void
  legalJustification: string
  onLegalJustificationChange: (value: string) => void
  className?: string
}

/**
 * Curation checklist v1 — the six blocking criteria plus the manual
 * needs_legal_review flag with its mandatory justification (Flow P3 §4.3.3
 * and §4.4). Any unchecked criterion makes publication impossible; the
 * server-side publish gate re-validates independently of this UI.
 */
export function BlockingChecklist({
  checklist,
  onToggle,
  needsLegalReview,
  onNeedsLegalReviewChange,
  legalJustification,
  onLegalJustificationChange,
  className,
}: BlockingChecklistProps) {
  const missing = missingCriteria(checklist)

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Blocking checklist</CardTitle>
        {missing.length === 0 ? (
          <Badge variant="secondary">All criteria met</Badge>
        ) : (
          <Badge variant="outline">{missing.length} of {CURATION_BLOCKING_CRITERIA.length} unchecked</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-md">
        <div className="space-y-sm">
          {CURATION_BLOCKING_CRITERIA.map((criterion) => (
            <div key={criterion.key} className="flex items-start gap-sm">
              <Checkbox
                id={`criterion-${criterion.key}`}
                checked={checklist[criterion.key] === true}
                onCheckedChange={(checked) => onToggle(criterion.key, checked === true)}
                className="mt-2xs"
              />
              <div className="space-y-2xs">
                <Label htmlFor={`criterion-${criterion.key}`} className="text-text-primary">
                  {criterion.label}
                </Label>
                <p className="text-sm text-text-secondary">{criterion.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-sm border-t border-border-subtle pt-md">
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
                Declared license is ambiguous or the context is suspicious. The part stays saved but cannot be published until cleared.
              </p>
            </div>
          </div>

          {needsLegalReview && (
            <div className="space-y-2xs">
              <Label htmlFor="legal-justification">Justification (required)</Label>
              <Textarea
                id="legal-justification"
                rows={3}
                value={legalJustification}
                onChange={(e) => onLegalJustificationChange(e.target.value)}
                placeholder="Why does this part need legal review?"
                maxLength={1000}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
