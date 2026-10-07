"use client"

import * as React from "react"
import { PartCard } from "@/components/part/part-card"
import { EvidenceLevelBadge } from "@/components/part/evidence-level-badge"
import type { ProductPart } from "@/lib/supabase/queries/product-page"

type SortKey = "downloads" | "newest"

interface ProductPartsGridProps {
  parts: ProductPart[]
}

function sortParts(parts: ProductPart[], sortKey: SortKey): ProductPart[] {
  return [...parts].sort((a, b) => {
    if (sortKey === "downloads") return b.download_count - a.download_count
    const aTime = a.created_at ? Date.parse(a.created_at) : 0
    const bTime = b.created_at ? Date.parse(b.created_at) : 0
    return bTime - aTime
  })
}

export function ProductPartsGrid({ parts }: ProductPartsGridProps) {
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
            key={part.card.id}
            part={part.card}
            badge={<EvidenceLevelBadge level={part.evidence_level} />}
          />
        ))}
      </div>
    </div>
  )
}
