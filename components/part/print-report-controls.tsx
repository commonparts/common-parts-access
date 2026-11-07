'use client'

import * as React from "react"
import { useTranslations } from "next-intl"
import { reportPrint } from "@/lib/actions/print-reports"
import { cn } from "@/lib/utils"
import {
  MAX_PRINT_REPORT_COMMENT_LENGTH,
  type PrintReportResult,
  type PrintReportStats,
} from "@/lib/utils/print-reports"
import { Button } from "@/components/ui/button"
import { NativeSelect } from "@/components/ui/native-select"
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

// Each result is labelled by the `PrintReport.results` message of the same key.
const RESULT_OPTIONS: { result: PrintReportResult; count: (stats: PrintReportStats) => number }[] = [
  { result: "works", count: (s) => s.works },
  { result: "works_with_adjustments", count: (s) => s.worksWithAdjustments },
  { result: "does_not_work", count: (s) => s.doesNotWork },
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
  const t = useTranslations("PrintReport")
  const [reportedResult, setReportedResult] = React.useState<PrintReportResult | null>(null)
  const [comment, setComment] = React.useState("")
  const [referenceId, setReferenceId] = React.useState("")
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [pending, setPending] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const idPrefix = React.useId()

  /** Files the report; resolves to whether the server accepted it. */
  const submit = async (result: PrintReportResult, successMessage: string): Promise<boolean> => {
    setPending(true)
    setMessage(null)
    try {
      const response = await reportPrint({
        partId,
        productId,
        result,
        // Always resend the details so changing the result keeps them.
        comment,
        productReferenceId: referenceId || null,
      })
      if (!response.ok) {
        setMessage(response.error)
        return false
      }
      setReportedResult(result)
      onStatsChange(response.data)
      setMessage(successMessage)
      return true
    } catch {
      setMessage(t("failed"))
      return false
    } finally {
      setPending(false)
    }
  }

  const handleSaveDetails = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!reportedResult) return
    // Keep the form open on failure so the comment is not lost.
    if (await submit(reportedResult, t("detailsSaved"))) setDetailsOpen(false)
  }

  return (
    <div className={cn("space-y-xs", className)}>
      <div
        role="group"
        aria-label={t("groupLabel", { product: productName })}
        className="flex flex-wrap gap-xs"
      >
        {RESULT_OPTIONS.map(({ result, count }) => (
          <Button
            key={result}
            type="button"
            size="sm"
            variant={reportedResult === result ? "default" : "outline"}
            aria-pressed={reportedResult === result}
            disabled={pending}
            onClick={() => submit(result, t("recorded"))}
          >
            {t(`results.${result}`)}
            <span className="tabular-nums" aria-label={t("reportCount", { count: count(stats) })}>
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
          {t("addDetails")}
        </Button>
      )}

      {reportedResult && detailsOpen && (
        <form onSubmit={handleSaveDetails} className="space-y-xs">
          <div className="space-y-2xs">
            <Label htmlFor={`${idPrefix}-comment`}>{t("commentLabel")}</Label>
            <Textarea
              id={`${idPrefix}-comment`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={MAX_PRINT_REPORT_COMMENT_LENGTH}
              rows={2}
              placeholder={t("commentPlaceholder")}
            />
          </div>
          {references.length > 0 && (
            <div className="space-y-2xs">
              <Label htmlFor={`${idPrefix}-reference`}>{t("referenceLabel")}</Label>
              <NativeSelect
                id={`${idPrefix}-reference`}
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
              >
                <option value="">{t("referenceNone")}</option>
                {references.map((reference) => (
                  <option key={reference.id} value={reference.id}>
                    {reference.value}
                  </option>
                ))}
              </NativeSelect>
            </div>
          )}
          <div className="flex gap-xs">
            <Button type="submit" size="sm" disabled={pending}>
              {t("save")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setDetailsOpen(false)}>
              {t("cancel")}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
