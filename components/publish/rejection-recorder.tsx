'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('RejectionRecorder')
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-sm">
        <p className="text-sm text-text-secondary">{t('intro')}</p>
        <Textarea
          rows={2}
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder={t('placeholder')}
          maxLength={REASON_MAX_LENGTH}
          aria-label={t('reasonLabel')}
        />
        <Button
          variant="outline"
          onClick={onRecord}
          disabled={recording || !reason.trim() || !sourceUrl.trim()}
        >
          {recording ? t('recording') : t('record')}
        </Button>
      </CardContent>
    </Card>
  )
}
