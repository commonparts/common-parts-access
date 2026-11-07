'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PUBLISH_TRACKS, RECOMMENDED_TRACK, type PublishTrack } from '@/lib/publish/tracks'
import { cn } from '@/lib/utils'

interface OrientationQuestionProps {
  onChoose: (track: PublishTrack) => void
  className?: string
}

/**
 * The single question that routes a new session onto one of the two tracks
 * (issue #303).
 *
 * It asks where the part comes from, not who designed it — a fact the
 * contributor can check rather than a judgement about their own rights. A
 * designer whose files already live on their own repository answers "already
 * published elsewhere" and is credited as the original author there.
 */
export function OrientationQuestion({ onChoose, className }: OrientationQuestionProps) {
  const t = useTranslations('OrientationQuestion')
  const tracks = useTranslations('PublishTracks')
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-md">
        <div className="grid grid-cols-1 gap-sm md:grid-cols-2">
          {PUBLISH_TRACKS.map((track) => (
            <button
              key={track}
              type="button"
              onClick={() => onChoose(track)}
              className={cn(
                'flex flex-col gap-2xs rounded-lg border border-border-default bg-bg-surface p-md text-left',
                'hover:bg-bg-hover',
                'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface focus-visible:border-border-focus',
              )}
            >
              <span className="flex flex-wrap items-center gap-2xs">
                <span className="font-medium text-text-primary">{tracks(`${track}.answer`)}</span>
                {track === RECOMMENDED_TRACK && <Badge tone="accent">{t('recommended')}</Badge>}
              </span>
              <span className="text-sm text-text-secondary">{tracks(`${track}.detail`)}</span>
            </button>
          ))}
        </div>
        <p className="text-sm text-text-secondary">{t('fixed')}</p>
      </CardContent>
    </Card>
  )
}
