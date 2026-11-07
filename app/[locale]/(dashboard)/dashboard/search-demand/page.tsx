import type { Metadata } from "next"
import { getFormatter, getLocale, getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import { notFound } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { Badge } from "@/components/ui/badge"
import {
  fetchPendingProductReferences,
  fetchTopSearchMisses,
} from "@/lib/supabase/queries/search-demand"
import { createClient } from "@/lib/supabase/server"
import { isCurator } from "@/lib/auth/permissions"
import { formatRegionName } from "@/lib/utils/formatters"
import type { ProductReferenceType } from "@/lib/utils/product-references"
import { isSearchMissOutcome, SEARCH_MISS_OUTCOMES } from "@/types/search"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("SearchDemandPage")
  return { title: t("title") }
}

// Window and size of the "most frequent misses" table.
const MISSES_WINDOW_DAYS = 30
const MISSES_LIMIT = 50
const PENDING_LIMIT = 50

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

  const [t, format, locale] = await Promise.all([getTranslations("SearchDemandPage"), getFormatter(), getLocale()])
  const formatDate = (date: string) => format.dateTime(new Date(date), { dateStyle: "medium" })
  const [misses, pending] = await Promise.all([
    fetchTopSearchMisses(MISSES_WINDOW_DAYS, MISSES_LIMIT, outcome),
    fetchPendingProductReferences(PENDING_LIMIT),
  ])

  return (
    <DashboardShell
      title={t("title")}
      description={t("description")}
    >
      <section className="space-y-sm">
        <h2 className="font-heading text-heading-sm font-semibold text-text-primary">{t("misses")}</h2>
        <p className="text-body text-text-secondary">{t("missesIntro", { days: MISSES_WINDOW_DAYS })}</p>
        <nav aria-label={t("filterLabel")} className="flex flex-wrap gap-xs">
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
                  {value ? t(`outcomes.${value}`) : t("allOutcomes")}
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
                  <th className={HEAD}>{t("search")}</th>
                  <th className={HEAD}>{t("outcome")}</th>
                  <th className={HEAD}>{t("days")}</th>
                  <th className={HEAD}>{t("lastSeen")}</th>
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
                        className="text-action-primary hover:text-action-primaryHover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                      >
                        {miss.raw_query}
                      </Link>
                    </td>
                    <td className={`${CELL} text-text-secondary`}>{t(`outcomes.${miss.outcome}`)}</td>
                    <td className={`${CELL} text-text-primary`}>{miss.miss_count}</td>
                    <td className={`${CELL} text-text-secondary`}>{formatDate(miss.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-body text-text-secondary">
            {outcome ? t("noMissesWithOutcome", { outcome: t(`outcomes.${outcome}`) }) : t("noMisses")}
          </p>
        )}
      </section>

      <section className="space-y-sm">
        <h2 className="font-heading text-heading-sm font-semibold text-text-primary">{t("pending")}</h2>
        <p className="text-body text-text-secondary">{t.rich("pendingIntro", { code: (chunks) => <code>{chunks}</code> })}</p>
        {pending.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={HEAD}>{t("reference")}</th>
                  <th className={HEAD}>{t("product")}</th>
                  <th className={HEAD}>{t("type")}</th>
                  <th className={HEAD}>{t("region")}</th>
                  <th className={HEAD}>{t("suggested")}</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((reference) => (
                  <tr key={reference.id}>
                    <td className={`${CELL} text-text-primary`}>{reference.value}</td>
                    <td className={`${CELL} text-text-primary`}>
                      <Link
                        href={`/product/${reference.product_slug}`}
                        className="text-action-primary hover:text-action-primaryHover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
                      >
                        {[reference.brand_name, reference.product_name].filter(Boolean).join(" ")}
                      </Link>
                    </td>
                    <td className={`${CELL} text-text-secondary`}>
                      {/* product_references.type is CHECK-constrained to the reference types. */}
                      {t(`referenceTypes.${reference.type as ProductReferenceType}`)}
                    </td>
                    <td className={`${CELL} text-text-secondary`}>
                      {reference.region ? formatRegionName(reference.region, locale) : "—"}
                    </td>
                    <td className={`${CELL} text-text-secondary`}>{formatDate(reference.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-body text-text-secondary">{t("noPending")}</p>
        )}
      </section>
    </DashboardShell>
  )
}
