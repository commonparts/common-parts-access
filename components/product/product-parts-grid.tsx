"use client"

import * as React from "react"
import { ModelCard } from "@/components/model/model-card"
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
          <ModelCard
            key={part.id}
            model={toModelCardModel(part)}
            showStats={false}
            showAuthor={Boolean(part.author_username)}
            showPartMeta
          />
        ))}
      </div>
    </div>
  )
}
