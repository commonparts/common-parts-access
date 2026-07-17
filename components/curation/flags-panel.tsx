'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CURATION_FLAGS, type CurationFlagColumn } from '@/lib/curation/checklist'

interface FlagsPanelProps {
  /** Positive confirmations: confirmed[column] true means the needs_* flag is NOT set. */
  confirmed: Record<CurationFlagColumn, boolean>
  onToggle: (column: CurationFlagColumn, confirmed: boolean) => void
  className?: string
}

/**
 * Non-blocking curation flags (Flow P3 §4.3.6). Each item is a positive
 * confirmation; leaving one unchecked sets the corresponding needs_* flag on
 * the record. None of these block publication.
 */
export function FlagsPanel({ confirmed, onToggle, className }: FlagsPanelProps) {
  const flaggedCount = CURATION_FLAGS.filter((flag) => !confirmed[flag.column]).length

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Completeness (non-blocking)</CardTitle>
        {flaggedCount > 0 ? (
          <Badge variant="outline">{flaggedCount} flags will be set</Badge>
        ) : (
          <Badge variant="secondary">Complete</Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-sm">
        {CURATION_FLAGS.map((flag) => (
          <div key={flag.column} className="flex items-start gap-sm">
            <Checkbox
              id={`flag-${flag.column}`}
              checked={confirmed[flag.column]}
              onCheckedChange={(checked) => onToggle(flag.column, checked === true)}
              className="mt-2xs"
            />
            <div className="space-y-2xs">
              <Label htmlFor={`flag-${flag.column}`} className="text-text-primary">
                {flag.label}
              </Label>
              <p className="text-sm text-text-secondary">{flag.description}</p>
            </div>
          </div>
        ))}
        <p className="text-sm text-text-secondary border-t border-border-subtle pt-sm">
          Unchecked items set the matching <code>needs_*</code> flag on the record — the part stays publishable.
        </p>
      </CardContent>
    </Card>
  )
}
