'use client'

import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface ConfirmationDialogProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
  className?: string
}

const FOCUSABLE_SELECTORS =
  'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * A confirmation dialog rendered as a modal overlay.
 * Traps Tab/Shift+Tab focus within the dialog panel, restores focus to the
 * previously active element on close, and closes on Escape or backdrop click.
 * Uses no external dialog library — relies on conditional rendering + ARIA.
 */
export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
  className,
}: ConfirmationDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<Element | null>(null)

  // Store the element that was focused before the dialog opened so we can
  // restore it when the dialog closes.
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement
      containerRef.current?.focus()
    } else if (previousFocusRef.current instanceof HTMLElement) {
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [open])

  // Close on Escape; trap Tab/Shift+Tab within the dialog.
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
        return
      }

      if (e.key !== 'Tab' || !containerRef.current) return

      const focusable = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first || document.activeElement === containerRef.current) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-dialog-title"
      aria-describedby={description ? 'confirmation-dialog-description' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />
      {/* Dialog panel */}
      <div
        ref={containerRef}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full max-w-sm rounded-lg border border-border-default bg-bg-surface p-lg shadow-lg focus:outline-none',
          className
        )}
      >
        <h2
          id="confirmation-dialog-title"
          className="text-sm font-semibold text-text-primary"
        >
          {title}
        </h2>
        {description && (
          <p
            id="confirmation-dialog-description"
            className="mt-xs text-sm text-text-secondary"
          >
            {description}
          </p>
        )}
        <div className="mt-lg flex justify-end gap-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Deleting…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
