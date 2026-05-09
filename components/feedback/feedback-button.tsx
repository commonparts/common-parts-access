'use client'

import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FeedbackForm } from './feedback-form'

export function FeedbackButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="default"
        size="icon"
        onClick={() => setOpen(true)}
        className="fixed bottom-lg right-lg z-50"
        aria-label="Send feedback"
      >
        <MessageSquare aria-hidden="true" />
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
            className="fixed left-lg right-lg top-lg bottom-lg z-50 sm:left-auto sm:right-lg sm:w-full sm:max-w-sm"
          >
            <Card className="flex h-full max-h-full flex-col shadow-none">
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
              <CardContent className="flex-1 overflow-y-auto pt-0">
                <FeedbackForm onClose={() => setOpen(false)} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  )
}