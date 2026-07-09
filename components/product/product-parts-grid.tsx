"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { formatNumber, formatPrintTime } from "@/lib/utils/formatters"
import type { ProductPart } from "@/lib/supabase/queries/product-page"

type SortKey = "downloads" | "newest"

interface ProductPartsGridProps {
  parts: ProductPart[]
  // Label for the "Verified on {reference}" badge — this page's reference.
  referenceLabel: string
  // Label for the declared "Fits {family}" badge — the family (or product) name.
  fitsLabel: string
}

// Verified-on-this-reference parts always rank first; the sort control orders
// within that grouping.
function sortParts(parts: ProductPart[], sortKey: SortKey): ProductPart[] {
  return [...parts].sort((a, b) => {
    if (a.verified_here !== b.verified_here) return a.verified_here ? -1 : 1
    if (sortKey === "downloads") return b.download_count - a.download_count
    const aTime = a.created_at ? Date.parse(a.created_at) : 0
    const bTime = b.created_at ? Date.parse(b.created_at) : 0
    return bTime - aTime
  })
}

export function ProductPartsGrid({ parts, referenceLabel, fitsLabel }: ProductPartsGridProps) {
  const [sortKey, setSortKey] = React.useState<SortKey>("downloads")
  const sorted = React.useMemo(() => sortParts(parts, sortKey), [parts, sortKey])

  return (
    <div className="space-y-md">
      <div className="flex items-center justify-between gap-sm">
        <h2 className="font-heading text-heading-sm font-semibold text-text-primary">Parts</h2>
        <label className="flex items-center gap-sm text-caption text-text-secondary">
          Sort
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-lg border border-border-subtle bg-bg-surface px-md py-sm text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
          >
            <option value="downloads">Most downloaded</option>
            <option value="newest">Newest</option>
          </select>
        </label>
      </div>

      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((part) => (
          <PartCard
            key={part.id}
            part={part}
            referenceLabel={referenceLabel}
            fitsLabel={fitsLabel}
          />
        ))}
      </div>
    </div>
  )
}

function PartCard({
  part,
  referenceLabel,
  fitsLabel,
}: {
  part: ProductPart
  referenceLabel: string
  fitsLabel: string
}) {
  const printTime = formatPrintTime(part.estimated_print_time)
  return (
    <Link
      href={`/model/${part.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border-subtle bg-bg-surface shadow-surface transition-colors hover:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
    >
      <div className="relative aspect-video overflow-hidden bg-bg-subtle">
        {part.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={part.thumbnail_url} alt={part.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-disabled">
            <svg aria-hidden="true" className="size-lg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        )}
        <div className="absolute left-sm top-sm">
          <CompatibilityBadge
            verified={part.verified_here}
            referenceLabel={referenceLabel}
            fitsLabel={fitsLabel}
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-sm p-md">
        <h3 className="line-clamp-2 font-heading text-sm font-semibold text-text-primary">
          {part.name}
        </h3>

        <div className="flex flex-wrap items-center gap-x-md gap-y-xs text-caption text-text-secondary">
          {part.author_username && <span>@{part.author_username}</span>}
          {part.material && <span>{part.material}</span>}
          {printTime && <span>{printTime}</span>}
          <span>{formatNumber(part.download_count)} downloads</span>
        </div>

        {part.license_short_name && (
          <div className="mt-auto pt-xs">
            <Badge variant="outline">{part.license_short_name}</Badge>
          </div>
        )}
      </div>
    </Link>
  )
}

function CompatibilityBadge({
  verified,
  referenceLabel,
  fitsLabel,
}: {
  verified: boolean
  referenceLabel: string
  fitsLabel: string
}) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-xs rounded-full bg-status-success px-sm py-xs text-xs font-semibold text-status-successText">
        <svg aria-hidden="true" className="size-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
        </svg>
        Verified on {referenceLabel}
      </span>
    )
  }
  return (
    <span className={cn("inline-flex items-center rounded-full border border-border-subtle bg-bg-surface px-sm py-xs text-xs font-medium text-text-secondary")}>
      Fits {fitsLabel}
    </span>
  )
}
