'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FeedbackForm } from './feedback-form'

export function FeedbackButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="fixed bottom-lg right-lg z-50 shadow-none"
      >
        Feedback
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="feedback-panel-title"
            className="fixed bottom-[4.5rem] right-lg z-50 max-w-sm"
          >
            <Card className="shadow-none">
              <CardHeader className="flex-row items-center justify-between pb-xs">
                <CardTitle id="feedback-panel-title" className="text-heading-sm font-semibold text-text-primary">
                  Send feedback
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-text-secondary transition-colors hover:text-text-primary"
                  aria-label="Close feedback panel"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </CardHeader>
              <CardContent className="pt-0">
                <FeedbackForm onClose={() => setOpen(false)} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  )
}