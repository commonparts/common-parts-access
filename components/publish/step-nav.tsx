'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface StepNavProps {
  /** Left action: the previous step, or leaving the session on the first one. */
  onBack: () => void
  backLabel?: string
  /**
   * Saves and leaves. Omitted on the first step of a new part, where there is
   * no draft yet and so nothing to come back to.
   */
  onSaveAndExit?: () => void
  saveAndExitLabel?: string
  onContinue: () => void
  continueLabel?: string
  continueDisabled?: boolean
  saving: boolean
  className?: string
}

/**
 * The footer of every publish step, identical on both tracks (issue #302).
 * Extracted because both tools repeated it once per step, which is how the
 * two flows drifted into different disabled conditions for the same button.
 */
export function StepNav({
  onBack,
  backLabel = 'Back',
  onSaveAndExit,
  saveAndExitLabel = 'Save and exit',
  onContinue,
  continueLabel = 'Continue',
  continueDisabled = false,
  saving,
  className,
}: StepNavProps) {
  return (
    <div className={cn('flex justify-between', className)}>
      <Button variant="outline" onClick={onBack} disabled={saving}>
        {backLabel}
      </Button>
      <div className="flex gap-sm">
        {onSaveAndExit && (
          <Button variant="ghost" onClick={onSaveAndExit} disabled={saving}>
            {saveAndExitLabel}
          </Button>
        )}
        <Button onClick={onContinue} disabled={saving || continueDisabled}>
          {saving ? 'Saving…' : continueLabel}
        </Button>
      </div>
    </div>
  )
}
