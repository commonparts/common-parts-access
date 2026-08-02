import * as React from "react"

import { Grid } from "@/components/layout/grid"
import { cn } from "@/lib/utils"
import type { PartCardData } from "@/types/models"
import { PartCard } from "./part-card"

interface PartGridProps {
  parts: PartCardData[]
  loading?: boolean
  variant?: "default" | "compact" | "detailed"
  columns?: 12 | 6 | 4
  className?: string
}

export function PartGrid({
  parts,
  loading = false,
  variant = "default",
  columns,
  className,
}: PartGridProps) {
  const gridColumns = columns ?? 12

  const getItemSpans = () => {
    if (variant === "compact") {
      if (gridColumns === 4) return "col-span-4 sm:col-span-2"
      if (gridColumns === 6) return "col-span-6 sm:col-span-3 md:col-span-2"
      return "col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-2"
    }

    if (variant === "detailed") {
      if (gridColumns === 4) return "col-span-4"
      if (gridColumns === 6) return "col-span-6 sm:col-span-3"
      return "col-span-12 md:col-span-6 lg:col-span-4"
    }

    // default
    if (gridColumns === 4) return "col-span-4 sm:col-span-2"
    if (gridColumns === 6) return "col-span-6 sm:col-span-3 md:col-span-2"
    return "col-span-12 sm:col-span-6 md:col-span-4 lg:col-span-3"
  }

  const itemSpans = getItemSpans()

  if (loading) {
    return (
      <Grid columns={gridColumns} className={className}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={cn("animate-pulse", itemSpans)}>
            <div className="mb-sm aspect-video rounded-lg bg-muted"></div>
            <div className="space-y-1">
              <div className="h-4 w-3/4 rounded bg-muted"></div>
              <div className="h-3 w-1/2 rounded bg-muted"></div>
            </div>
          </div>
        ))}
      </Grid>
    )
  }

  if (parts.length === 0) {
    return (
      <div className="py-xl text-center">
        <div className="mx-auto mb-sm flex h-16 w-16 items-center justify-center rounded-full bg-border-subtle">
          <svg className="h-8 w-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-heading-sm font-semibold text-text-primary">No parts found</h3>
        <p className="text-body text-text-secondary">Try adjusting your search or filters</p>
      </div>
    )
  }

  return (
    <Grid columns={gridColumns} className={className}>
      {parts.map((part) => (
        <div key={part.id} className={itemSpans}>
          <PartCard part={part} variant={variant} />
        </div>
      ))}
    </Grid>
  )
}