'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  MAX_PRINT_REPORT_COMMENT_LENGTH,
  type PrintReportResult,
  type PrintReportStats,
} from "@/lib/utils/print-reports"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export interface PrintReportReference {
  id: string
  value: string
}

interface PrintReportControlsProps {
  partId: string
  productId: string
  productName: string
  stats: PrintReportStats
  references: PrintReportReference[]
  /** Called with the pair's fresh counters after every accepted report. */
  onStatsChange: (stats: PrintReportStats) => void
  className?: string
}

const RESULT_OPTIONS: { result: PrintReportResult; label: string; count: (stats: PrintReportStats) => number }[] = [
  { result: "works", label: "Works", count: (s) => s.works },
  { result: "works_with_adjustments", label: "Works with adjustments", count: (s) => s.worksWithAdjustments },
  { result: "does_not_work", label: "Doesn't work", count: (s) => s.doesNotWork },
]

/**
 * One-click print report on one compatible product (issue #318). A result
 * button files the report straight away, with no account and no form. The
 * optional comment and reference come after, and saving them replaces the
 * same report. The counts on the buttons are the pair's reports so far.
 */
export function PrintReportControls({
  partId,
  productId,
  productName,
  stats,
  references,
  onStatsChange,
  className,
}: PrintReportControlsProps) {
  const [reportedResult, setReportedResult] = React.useState<PrintReportResult | null>(null)
  const [comment, setComment] = React.useState("")
  const [referenceId, setReferenceId] = React.useState("")
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const idPrefix = React.useId()

  const submit = async (result: PrintReportResult, successMessage: string) => {
    setPending(true)
    setMessage(null)
    try {
      const response = await fetch("/api/print-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId,
          productId,
          result,
          // Always resend the details so changing the result keeps them.
          comment,
          productReferenceId: referenceId || null,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        setMessage(data?.error ?? "Report failed: please try again")
        return
      }
      setReportedResult(result)
      onStatsChange(data.stats)
      setMessage(successMessage)
    } catch {
      setMessage("Report failed: check your connection and try again")
    } finally {
      setPending(false)
    }
  }

  const handleSaveDetails = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!reportedResult) return
    await submit(reportedResult, "Details saved. Thank you.")
    setDetailsOpen(false)
  }

  return (
    <div className={cn("space-y-xs", className)}>
      <div
        role="group"
        aria-label={`Report whether this part works on ${productName}`}
        className="flex flex-wrap gap-xs"
      >
        {RESULT_OPTIONS.map(({ result, label, count }) => (
          <Button
            key={result}
            type="button"
            size="sm"
            variant={reportedResult === result ? "default" : "outline"}
            aria-pressed={reportedResult === result}
            disabled={pending}
            onClick={() => submit(result, "Report recorded. Thank you.")}
          >
            {label}
            <span className="tabular-nums" aria-label={`${count(stats)} reports`}>
              {count(stats)}
            </span>
          </Button>
        ))}
      </div>

      {message && (
        <p role="status" className="text-caption text-text-secondary">
          {message}
        </p>
      )}

      {reportedResult && !detailsOpen && (
        <Button type="button" variant="link" size="sm" className="px-0" onClick={() => setDetailsOpen(true)}>
          Add a comment or reference
        </Button>
      )}

      {reportedResult && detailsOpen && (
        <form onSubmit={handleSaveDetails} className="space-y-xs">
          <div className="space-y-2xs">
            <Label htmlFor={`${idPrefix}-comment`}>Comment (optional)</Label>
            <Textarea
              id={`${idPrefix}-comment`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={MAX_PRINT_REPORT_COMMENT_LENGTH}
              rows={2}
              placeholder="Material, settings, what you adjusted"
            />
          </div>
          {references.length > 0 && (
            <div className="space-y-2xs">
              <Label htmlFor={`${idPrefix}-reference`}>Your product reference (optional)</Label>
              <select
                id={`${idPrefix}-reference`}
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                className="w-full rounded-lg border border-border-subtle bg-bg-surface px-md py-sm text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
              >
                <option value="">Not specified</option>
                {references.map((reference) => (
                  <option key={reference.id} value={reference.id}>
                    {reference.value}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex gap-xs">
            <Button type="submit" size="sm" disabled={pending}>
              Save details
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setDetailsOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
