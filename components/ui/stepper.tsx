import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StepperProps extends React.HTMLAttributes<HTMLElement> {
  /** Ordered step labels; the array length defines the number of steps. */
  labels: readonly string[]
  /** Zero-based index of the active step. */
  current: number
  /** Names the navigation for assistive technology, e.g. "Upload steps". */
  ariaLabel: string
}

/**
 * Progress indicator for the guided draft flows (curation, upload): completed
 * steps read as secondary, the active one as default, the rest as outline.
 * Display only — navigation happens through each step's own controls, which
 * persist the draft before moving.
 */
export function Stepper({ labels, current, ariaLabel, className, ...props }: StepperProps) {
  return (
    <nav aria-label={ariaLabel} className={cn('flex flex-wrap items-center gap-sm', className)} {...props}>
      {labels.map((label, index) => (
        <React.Fragment key={label}>
          {index > 0 && <span aria-hidden="true" className="text-text-disabled">→</span>}
          <Badge
            variant={index === current ? 'default' : index < current ? 'secondary' : 'outline'}
            aria-current={index === current ? 'step' : undefined}
          >
            {index + 1}. {label}
          </Badge>
        </React.Fragment>
      ))}
    </nav>
  )
}
