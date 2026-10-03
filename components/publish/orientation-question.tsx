'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PUBLISH_TRACKS, type PublishTrack } from '@/lib/publish/tracks'
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
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Where does this part come from?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-md">
        <div className="grid grid-cols-1 gap-sm md:grid-cols-2">
          {PUBLISH_TRACKS.map((definition) => (
            <button
              key={definition.track}
              type="button"
              onClick={() => onChoose(definition.track)}
              className={cn(
                'flex flex-col gap-2xs rounded-lg border border-border-default bg-bg-surface p-md text-left',
                'hover:bg-bg-hover',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface focus-visible:border-border-focus',
              )}
            >
              <span className="font-medium text-text-primary">{definition.answer}</span>
              <span className="text-sm text-text-secondary">{definition.detail}</span>
            </button>
          ))}
        </div>
        <p className="text-sm text-text-secondary">
          This answer is fixed once the draft is created. To change it afterwards, delete the draft
          and start again — you can change your mind freely until then.
        </p>
      </CardContent>
    </Card>
  )
}
