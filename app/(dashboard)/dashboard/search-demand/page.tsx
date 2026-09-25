import type { Metadata } from "next"
import Link from "next/link"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import {
  fetchPendingProductReferences,
  fetchTopSearchMisses,
} from "@/lib/supabase/queries/search-demand"
import { formatDate, formatRegionName } from "@/lib/utils/formatters"

export const metadata: Metadata = {
  title: "Search demand",
}

// Window and size of the "most frequent misses" table.
const MISSES_WINDOW_DAYS = 30
const MISSES_LIMIT = 50
const PENDING_LIMIT = 50

const CELL = "border-b border-border-subtle px-sm py-xs text-left align-top text-sm"
const HEAD = `${CELL} font-medium text-text-secondary`

/**
 * What searches could not answer (issue #320): the most frequent zero-result
 * searches, and the references visitors attached to a product from them.
 * Read-only and open to any signed-in user, like the curation tool — there is
 * no admin role. Pending references are validated or rejected by setting
 * `product_references.status` in the Supabase dashboard.
 */
export default async function SearchDemandPage() {
  const [misses, pending] = await Promise.all([
    fetchTopSearchMisses(MISSES_WINDOW_DAYS, MISSES_LIMIT),
    fetchPendingProductReferences(PENDING_LIMIT),
  ])

  return (
    <DashboardShell
      title="Search demand"
      description="Searches that found nothing, and the references visitors suggested from them."
    >
      <section className="space-y-sm">
        <h2 className="font-heading text-heading-sm font-semibold text-text-primary">
          Most frequent misses
        </h2>
        <p className="text-body text-text-secondary">
          Last {MISSES_WINDOW_DAYS} days. Spellings that normalize alike are counted together.
        </p>
        {misses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={HEAD}>Search</th>
                  <th className={HEAD}>Misses</th>
                  <th className={HEAD}>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {misses.map((miss) => (
                  <tr key={miss.normalized_query}>
                    <td className={`${CELL} text-text-primary`}>
                      <Link
                        href={`/search?q=${encodeURIComponent(miss.raw_query)}`}
                        className="text-action-primary hover:text-action-primaryHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                      >
                        {miss.raw_query}
                      </Link>
                    </td>
                    <td className={`${CELL} text-text-primary`}>{miss.miss_count}</td>
                    <td className={`${CELL} text-text-secondary`}>{formatDate(miss.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-body text-text-secondary">No zero-result search in this window.</p>
        )}
      </section>

      <section className="space-y-sm">
        <h2 className="font-heading text-heading-sm font-semibold text-text-primary">
          Pending references
        </h2>
        <p className="text-body text-text-secondary">
          Set <code>status</code> to <code>validated</code> or <code>rejected</code> on the
          row in <code>product_references</code> to review a suggestion.
        </p>
        {pending.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={HEAD}>Reference</th>
                  <th className={HEAD}>Product</th>
                  <th className={HEAD}>Type</th>
                  <th className={HEAD}>Region</th>
                  <th className={HEAD}>Suggested</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((reference) => (
                  <tr key={reference.id}>
                    <td className={`${CELL} text-text-primary`}>{reference.value}</td>
                    <td className={`${CELL} text-text-primary`}>
                      <Link
                        href={`/product/${reference.product_slug}`}
                        className="text-action-primary hover:text-action-primaryHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                      >
                        {[reference.brand_name, reference.product_name].filter(Boolean).join(" ")}
                      </Link>
                    </td>
                    <td className={`${CELL} text-text-secondary`}>{reference.type}</td>
                    <td className={`${CELL} text-text-secondary`}>
                      {reference.region ? formatRegionName(reference.region) : "—"}
                    </td>
                    <td className={`${CELL} text-text-secondary`}>{formatDate(reference.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-body text-text-secondary">No reference awaiting review.</p>
        )}
      </section>
    </DashboardShell>
  )
}
