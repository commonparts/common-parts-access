import { pluralize } from "@/lib/utils/formatters"
import type { PartRequestCount } from "@/types/database"

// Total demand across all requested descriptions for this product.
function totalRequests(counts: PartRequestCount[]): number {
  return counts.reduce((sum, c) => sum + c.request_count, 0)
}

// Demand badge — shown only when at least this many requests exist, so a single
// stray request never advertises "demand".
const MIN_DEMAND_TO_SHOW = 2

export function DemandBadge({ counts }: { counts: PartRequestCount[] }) {
  const total = totalRequests(counts)
  if (total < MIN_DEMAND_TO_SHOW) return null
  return (
    <span className="inline-flex items-center rounded-full bg-bg-subtle px-md py-xs text-caption font-medium text-text-secondary">
      {total} people requested a part for this product
    </span>
  )
}

// Public list of requested parts (description + count only — the RPC never
// exposes user_id or raw_query).
export function RequestedPartsList({ counts }: { counts: PartRequestCount[] }) {
  if (counts.length === 0) return null
  return (
    <div className="space-y-sm">
      <h3 className="font-heading text-sm font-semibold text-text-primary">Requested parts</h3>
      <ul className="divide-y divide-border-subtle rounded-lg border border-border-subtle">
        {counts.map((entry) => (
          <li
            key={entry.description}
            className="flex items-center justify-between gap-md px-md py-sm text-sm"
          >
            <span className="min-w-0 flex-1 truncate text-text-primary">{entry.description}</span>
            <span className="shrink-0 text-caption text-text-secondary">
              {pluralize(entry.request_count, "request")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
