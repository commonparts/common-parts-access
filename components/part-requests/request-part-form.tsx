"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { requestPart } from "@/lib/actions/part-requests"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type SubmitState = "idle" | "submitting" | "done" | "invalid" | "failed"

const MIN_DESCRIPTION_LENGTH = 2

export interface RequestPartFormProps {
  /** Attach the request to a product (product page). Omit for a free search. */
  productId?: string
  /** The failed search term, stored as raw_query for curation context. */
  rawQuery?: string
  defaultDescription?: string
  /** The submit button label; "Request this part" by default. */
  submitLabel?: string
}

/**
 * Shared "request this part" form. Submits through the `requestPart` Server
 * Action (anonymous allowed) with an optional product id and raw query.
 */
export function RequestPartForm({
  productId,
  rawQuery,
  defaultDescription = "",
  submitLabel,
}: RequestPartFormProps) {
  const t = useTranslations("RequestPartForm")
  const [description, setDescription] = React.useState(defaultDescription)
  const [state, setState] = React.useState<SubmitState>("idle")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = description.trim()
    if (trimmed.length < MIN_DESCRIPTION_LENGTH) {
      setState("invalid")
      return
    }

    setState("submitting")
    try {
      const response = await requestPart({
        description: trimmed,
        productId,
        rawQuery,
        pageUrl: window.location.href,
      })
      setState(response.ok ? "done" : "failed")
    } catch {
      setState("failed")
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-lg border border-border-subtle bg-bg-subtle p-lg text-sm text-text-primary">
        {t("done")}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-sm">
      <Textarea
        value={description}
        onChange={(e) => {
          setDescription(e.target.value)
          if (state === "invalid" || state === "failed") setState("idle")
        }}
        rows={3}
        aria-label={t("label")}
        placeholder={t("placeholder")}
      />
      {state === "invalid" && (
        <p className="text-caption text-text-secondary">
          {t("tooShort", { min: MIN_DESCRIPTION_LENGTH })}
        </p>
      )}
      {state === "failed" && (
        <p role="alert" className="text-sm text-status-errorText">
          {t("failed")}
        </p>
      )}
      <Button type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? t("sending") : (submitLabel ?? t("submit"))}
      </Button>
    </form>
  )
}
