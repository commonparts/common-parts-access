'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('LegalReviewEscalation')
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{t('title')}</CardTitle>
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
              {t('flag')}
            </Label>
            <p className="text-sm text-text-secondary">{t('flagDetail')}</p>
          </div>
        </div>

        {needsLegalReview && (
          <div className="space-y-2xs">
            <Label htmlFor="legal-justification">{t('justification')}</Label>
            <Textarea
              id="legal-justification"
              rows={3}
              value={justification}
              onChange={(e) => onJustificationChange(e.target.value)}
              placeholder={t('justificationPlaceholder')}
              maxLength={JUSTIFICATION_MAX_LENGTH}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
