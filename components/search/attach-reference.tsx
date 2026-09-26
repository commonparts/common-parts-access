"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { ProductCandidate } from "@/types/search"

type SubmitState = "idle" | "submitting" | "done" | "failed"

// Wait this long after the last keystroke before searching other products.
const SEARCH_DEBOUNCE_MS = 250

export interface AttachReferenceProps {
  /** The search that found nothing, stored as the suggested reference. */
  reference: string
  /** Products the query itself may name, found server-side. */
  initialCandidates: ProductCandidate[]
}

/**
 * Zero-result picker (issue #320): the visitor names the product an unknown
 * reference belongs to, among the products the query matched or by searching
 * for another one. Submits to POST /api/product-references, which stores the
 * reference pending; it reaches search only once validated.
 */
export function AttachReference({ reference, initialCandidates }: AttachReferenceProps) {
  const [candidates, setCandidates] = React.useState(initialCandidates)
  const [productQuery, setProductQuery] = React.useState("")
  const [selectedId, setSelectedId] = React.useState("")
  // True from a keystroke until its results replace the list, so a product
  // picked from the previous list cannot be submitted meanwhile.
  const [isSearching, setIsSearching] = React.useState(false)
  const [state, setState] = React.useState<SubmitState>("idle")
  const idPrefix = React.useId()

  // Search other products as the visitor types; an empty box goes back to
  // the products the original query matched. Stale responses are dropped.
  React.useEffect(() => {
    const term = productQuery.trim()
    if (!term) {
      setCandidates(initialCandidates)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/candidates?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`Candidate search failed: ${res.status}`)
        const body = (await res.json()) as { candidates: ProductCandidate[] }
        setCandidates(body.candidates)
        setIsSearching(false)
      } catch (err) {
        if (controller.signal.aborted) return
        console.error("AttachReference: candidate search failed", err)
        setCandidates([])
        setIsSearching(false)
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [productQuery, initialCandidates])

  // A selection stays only while its product is listed: searching again
  // must not submit a product the visitor can no longer see.
  const hasSelection = !isSearching && candidates.some((candidate) => candidate.id === selectedId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hasSelection) return

    setState("submitting")
    try {
      const res = await fetch("/api/product-references", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: selectedId, value: reference }),
      })
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      setState("done")
    } catch (err) {
      console.error("AttachReference: submission failed", err)
      setState("failed")
    }
  }

  if (state === "done") {
    return (
      <div className="rounded-lg border border-border-subtle bg-bg-subtle p-lg text-sm text-text-primary">
        Thanks. We check each suggestion before &ldquo;{reference}&rdquo; is added to search.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-sm">
      <Input
        type="search"
        value={productQuery}
        onChange={(e) => {
          // A new search drops the current pick; it is made again from the
          // list the search returns.
          setProductQuery(e.target.value)
          setSelectedId("")
          setIsSearching(e.target.value.trim() !== "")
        }}
        aria-label="Search for the product by brand or name"
        placeholder="Search by brand or product name…"
      />

      {!isSearching && candidates.length > 0 ? (
        <RadioGroup
          value={selectedId}
          onValueChange={(value) => {
            setSelectedId(value)
            if (state === "failed") setState("idle")
          }}
          aria-label="Product this reference belongs to"
          className="gap-xs"
        >
          {candidates.map((candidate) => {
            const inputId = `${idPrefix}-${candidate.id}`
            return (
              <div key={candidate.id} className="flex items-center gap-xs">
                <RadioGroupItem value={candidate.id} id={inputId} />
                <label htmlFor={inputId} className="cursor-pointer text-sm text-text-primary">
                  {candidate.brand_name && (
                    <span className="text-text-secondary">{candidate.brand_name} </span>
                  )}
                  {candidate.name}
                </label>
              </div>
            )
          })}
        </RadioGroup>
      ) : (
        <p className="text-caption text-text-secondary">
          {isSearching
            ? "Searching…"
            : productQuery.trim()
            ? "No product matches that search."
            : "Search for the brand or name of your device."}
        </p>
      )}

      {state === "failed" && (
        <p className="text-caption text-text-secondary">
          Something went wrong sending your suggestion. Please try again.
        </p>
      )}
      <Button type="submit" variant="outline" disabled={!hasSelection || state === "submitting"}>
        {state === "submitting" ? "Sending…" : "Suggest this product"}
      </Button>
    </form>
  )
}
