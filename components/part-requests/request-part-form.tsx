"use client"

import * as React from "react"
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
  placeholder?: string
  submitLabel?: string
  successMessage?: string
}

/**
 * Shared "request this part" form. Submits to POST /api/part-requests
 * (anonymous allowed) with an optional product_id and raw_query — never touches
 * the feedback table / triage pipeline, so it can't create a GitHub issue.
 */
export function RequestPartForm({
  productId,
  rawQuery,
  defaultDescription = "",
  placeholder = "Describe the part you need (brand, model, which part)…",
  submitLabel = "Request this part",
  successMessage = "Thanks — your request is logged. Parts with the most demand get prioritized for the catalog.",
}: RequestPartFormProps) {
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
      const res = await fetch("/api/part-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: trimmed,
          productId,
          rawQuery,
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      })
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      setState("done")
    } catch (err) {
      console.error("RequestPartForm: submission failed", err)
      setState("failed")
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-lg border border-border-subtle bg-bg-subtle p-lg text-sm text-text-primary">
        {successMessage}
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
        aria-label="Describe the part you need"
        placeholder={placeholder}
      />
      {state === "invalid" && (
        <p className="text-caption text-text-secondary">
          Please add a short description (at least {MIN_DESCRIPTION_LENGTH} characters) so we know what to source.
        </p>
      )}
      {state === "failed" && (
        <p className="text-caption text-text-secondary">
          Something went wrong sending your request. Please try again.
        </p>
      )}
      <Button type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? "Sending…" : submitLabel}
      </Button>
    </form>
  )
}
