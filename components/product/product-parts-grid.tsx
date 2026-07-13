"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ModelCard } from "@/components/model/model-card"
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

// Map a product part onto the shared ModelCard shape. Stats are hidden (the
// likes/views/date footer isn't relevant here); the part-meta row surfaces
// material, print time, downloads and the license badge.
function toModelCardModel(part: ProductPart) {
  return {
    id: part.id,
    slug: part.slug,
    title: part.name,
    thumbnailUrl: part.thumbnail_url ?? undefined,
    author: { username: part.author_username ?? "" },
    stats: { downloads: part.download_count, likes: 0, views: 0 },
    tags: [] as string[],
    category: "",
    createdAt: part.created_at ? new Date(part.created_at) : new Date(),
    material: part.material,
    license: part.license_short_name,
    estimatedPrintTime: part.estimated_print_time,
  }
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
          <ModelCard
            key={part.id}
            model={toModelCardModel(part)}
            showStats={false}
            showAuthor={Boolean(part.author_username)}
            showPartMeta
            badge={
              <CompatibilityBadge
                verified={part.verified_here}
                referenceLabel={referenceLabel}
                fitsLabel={fitsLabel}
              />
            }
          />
        ))}
      </div>
    </div>
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
