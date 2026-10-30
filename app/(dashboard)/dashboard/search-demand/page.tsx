import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import {
  fetchPendingProductReferences,
  fetchTopSearchMisses,
} from "@/lib/supabase/queries/search-demand"
import { createClient } from "@/lib/supabase/server"
import { isCurator } from "@/lib/auth/permissions"
import { formatDate, formatRegionName } from "@/lib/utils/formatters"
import { isSearchMissOutcome, SEARCH_MISS_OUTCOMES, type SearchMissOutcome } from "@/types/search"

export const metadata: Metadata = {
  title: "Search demand",
}

// Window and size of the "most frequent misses" table.
const MISSES_WINDOW_DAYS = 30
const MISSES_LIMIT = 50
const PENDING_LIMIT = 50

// Why a search was unserved (issue #452), as shown in the table and filter.
const OUTCOME_LABEL: Record<SearchMissOutcome, string> = {
  no_results: "No results",
  approximate: "Close matches only",
  no_parts: "Product without parts",
}

const CELL = "border-b border-border-subtle px-sm py-xs text-left align-top text-sm"
const HEAD = `${CELL} font-medium text-text-secondary`

/**
 * What searches could not answer (issues #320, #452): the most frequent
 * unserved searches, filterable by outcome, and the references visitors
 * attached to a product from them.
 * Read-only and restricted to curators (#435): sign-up is open, and the misses
 * are free text typed by visitors. Other users get a not-found page, so the
 * route does not reveal that it exists. Pending references are validated or
 * rejected by setting `product_references.status` in the Supabase dashboard.
 */
export default async function SearchDemandPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isCurator(user?.id)) notFound()

  // An unknown value shows every outcome rather than an empty table.
  const outcomeParam = (await searchParams).outcome
  const outcome = typeof outcomeParam === "string" && isSearchMissOutcome(outcomeParam) ? outcomeParam : null

  const [misses, pending] = await Promise.all([
    fetchTopSearchMisses(MISSES_WINDOW_DAYS, MISSES_LIMIT, outcome),
    fetchPendingProductReferences(PENDING_LIMIT),
  ])

  return (
    <DashboardShell
      title="Search demand"
      description="Searches that found no part, and the references visitors suggested from them."
    >
      <section className="space-y-sm">
        <h2 className="font-heading text-heading-sm font-semibold text-text-primary">
          Most frequent misses
        </h2>
        <p className="text-body text-text-secondary">
          Last {MISSES_WINDOW_DAYS} days. A search is a miss unless a part, or a product with a
          published part, matches it fully. Spellings that normalize alike are counted together;
          the outcome is the latest one.
        </p>
        <nav aria-label="Filter misses by outcome" className="flex flex-wrap gap-xs">
          {[null, ...SEARCH_MISS_OUTCOMES].map((value) => {
            const isActive = value === outcome
            return (
              <Badge
                key={value ?? "all"}
                asChild
                interactive
                size="md"
                variant={isActive ? "soft" : "outline"}
                tone={isActive ? "accent" : "neutral"}
              >
                <Link
                  href={value ? `/dashboard/search-demand?outcome=${value}` : "/dashboard/search-demand"}
                  aria-current={isActive ? "page" : undefined}
                >
                  {value ? OUTCOME_LABEL[value] : "All outcomes"}
                </Link>
              </Badge>
            )
          })}
        </nav>
        {misses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={HEAD}>Search</th>
                  <th className={HEAD}>Outcome</th>
                  <th className={HEAD}>Misses</th>
                  <th className={HEAD}>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {misses.map((miss) => (
                  <tr key={miss.normalized_query}>
                    <td className={`${CELL} text-text-primary`}>
                      {/* No prefetch: rendering /search for a miss logs it again. */}
                      <Link
                        href={`/search?q=${encodeURIComponent(miss.raw_query)}`}
                        prefetch={false}
                        className="text-action-primary hover:text-action-primaryHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                      >
                        {miss.raw_query}
                      </Link>
                    </td>
                    <td className={`${CELL} text-text-secondary`}>{OUTCOME_LABEL[miss.outcome]}</td>
                    <td className={`${CELL} text-text-primary`}>{miss.miss_count}</td>
                    <td className={`${CELL} text-text-secondary`}>{formatDate(miss.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-body text-text-secondary">No missed search in this window.</p>
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
