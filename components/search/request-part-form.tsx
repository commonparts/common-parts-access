"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type SubmitState = "idle" | "submitting" | "done" | "error"

const MIN_DESCRIPTION_LENGTH = 2

/**
 * Empty-state "Request this part" form. Submits to POST /api/part-requests with
 * the failed search as raw_query and no product_id (anonymous allowed). Does not
 * touch the feedback table / triage pipeline — never creates a GitHub issue.
 */
export function RequestPartForm({ query }: { query: string }) {
  const [description, setDescription] = React.useState(query)
  const [state, setState] = React.useState<SubmitState>("idle")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = description.trim()
    if (trimmed.length < MIN_DESCRIPTION_LENGTH) {
      setState("error")
      return
    }

    setState("submitting")
    try {
      const res = await fetch("/api/part-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: trimmed,
          rawQuery: query,
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      })
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      setState("done")
    } catch (err) {
      console.error("RequestPartForm: submission failed", err)
      setState("error")
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-lg border border-border-subtle bg-bg-subtle p-lg text-sm text-text-primary">
        Thanks — your request is logged. Parts with the most demand get prioritized for the catalog.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-sm">
      <Textarea
        value={description}
        onChange={(e) => {
          setDescription(e.target.value)
          if (state === "error") setState("idle")
        }}
        rows={3}
        aria-label="Describe the part you need"
        placeholder="Describe the part you need (brand, model, which part)…"
      />
      {state === "error" && (
        <p className="text-caption text-text-secondary">
          Please add a short description (at least {MIN_DESCRIPTION_LENGTH} characters) so we know what to source.
        </p>
      )}
      <Button type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? "Sending…" : "Request this part"}
      </Button>
    </form>
  )
}
