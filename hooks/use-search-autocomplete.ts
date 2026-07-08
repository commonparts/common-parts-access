"use client"

import * as React from "react"
import {
  emptySearchResults,
  SEARCH_DEFAULT_LIMIT,
  type SearchResults,
} from "@/types/search"

// Start querying only from the 2nd character and debounce so a fast typist
// issues one request per pause, not one per keystroke.
export const SEARCH_MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 250

export interface UseSearchAutocomplete {
  results: SearchResults
  isLoading: boolean
  error: boolean
}

/**
 * Debounced client-side autocomplete against GET /api/search.
 *
 * Fires ~250 ms after the last keystroke once the trimmed query reaches
 * SEARCH_MIN_QUERY_LENGTH, and aborts any in-flight request when the query
 * changes or the consumer unmounts so late responses can't overwrite fresh
 * state. Below the minimum length (or when disabled) it resets to empty.
 */
export function useSearchAutocomplete(query: string, enabled: boolean): UseSearchAutocomplete {
  const [results, setResults] = React.useState<SearchResults>(emptySearchResults)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState(false)

  React.useEffect(() => {
    const trimmed = query.trim()

    if (!enabled || trimmed.length < SEARCH_MIN_QUERY_LENGTH) {
      setResults(emptySearchResults())
      setIsLoading(false)
      setError(false)
      return
    }

    let active = true
    const controller = new AbortController()
    setIsLoading(true)
    setError(false)

    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=${SEARCH_DEFAULT_LIMIT}`, {
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`Search request failed: ${res.status}`)
          return (await res.json()) as SearchResults
        })
        .then((data) => {
          if (!active) return
          setResults({
            products: data.products ?? [],
            models: data.models ?? [],
            brands: data.brands ?? [],
          })
          setIsLoading(false)
        })
        .catch((err: unknown) => {
          if (!active || (err instanceof DOMException && err.name === "AbortError")) return
          console.error("useSearchAutocomplete: search request failed", err)
          setError(true)
          setResults(emptySearchResults())
          setIsLoading(false)
        })
    }, DEBOUNCE_MS)

    return () => {
      active = false
      controller.abort()
      clearTimeout(timer)
    }
  }, [query, enabled])

  return { results, isLoading, error }
}
