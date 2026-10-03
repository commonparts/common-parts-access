'use client'

import * as React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface JudgementCheckboxProps {
  id: string
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  /**
   * Extra context rendered under the description — used to note a condition
   * the tool has already observed (a passing duplicate check, for instance).
   * It never ticks the box: the confirmation stays an explicit human act.
   */
  hint?: React.ReactNode
  className?: string
}

/**
 * One judgement the contributor makes about the part, rendered inline next to
 * the evidence it concerns (issue #302).
 *
 * Used for both the blocking criteria and the non-blocking completeness
 * confirmations. The two remain different things — one blocks publication, the
 * other only records what is still missing — but they are the same control, so
 * they share one component rather than two near-identical ones.
 */
export function JudgementCheckbox({
  id,
  label,
  description,
  checked,
  onChange,
  hint,
  className,
}: JudgementCheckboxProps) {
  return (
    <div className={cn('flex items-start gap-sm', className)}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onChange(value === true)}
        className="mt-2xs"
      />
      <div className="space-y-2xs">
        <Label htmlFor={id} className="text-text-primary">
          {label}
        </Label>
        <p className="text-sm text-text-secondary">{description}</p>
        {hint && <p className="text-sm text-text-secondary">{hint}</p>}
      </div>
    </div>
  )
}
