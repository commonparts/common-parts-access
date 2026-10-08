import * as React from "react"
import { PartCard } from "@/components/part/part-card"
import { EvidenceLevelBadge } from "@/components/part/evidence-level-badge"
import type { ProductPart } from "@/lib/supabase/queries/product-page"

interface ProductPartsGridProps {
  /** One page of the product's parts, rendered in the order received (newest first). */
  parts: ProductPart[]
}

export function ProductPartsGrid({ parts }: ProductPartsGridProps) {
  return (
    <div className="space-y-md">
      <h2 className="font-heading text-heading-sm font-semibold text-text-primary">Parts</h2>

      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
        {parts.map((part) => (
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
