"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PartGrid } from "@/components/part/part-grid"
import { ProductResultCard } from "@/components/search/product-result-card"
import { BrandResultCard } from "@/components/search/brand-result-card"
import { RequestPartForm } from "@/components/part-requests/request-part-form"
import { AttachReference } from "@/components/search/attach-reference"
import type { BrandSuggestion } from "@/lib/supabase/queries/search"
import { splitUnservedResults } from "@/lib/utils/search-outcome"
import type { PartCardData } from "@/types/parts"
import {
  SEARCH_TYPES,
  type ProductCandidate,
  type SearchMissOutcome,
  type SearchOutcome,
  type SearchResults,
  type SearchType,
} from "@/types/search"

// How many items each section previews in the "All" view before "See all".
const PREVIEW_COUNT = 4

interface SearchResultsViewProps {
  results: SearchResults
  /** The part hits as standard part cards, in rank order (see fetchPartCardsByIds). */
  partCards: PartCardData[]
  query: string
  initialType: SearchType
  /** Whether a full match with a published part answered the query (see classifySearch). */
  outcome: SearchOutcome
  brandSuggestion: BrandSuggestion | null
  /** Products an unserved query may name, for the reference picker. */
  candidates: ProductCandidate[]
}

/**
 * The /search results. A served search shows its grouped results with the
 * type filter. An unserved one (issue #452) leads with the zero-result block,
 * so the part request is offered first, then lists the products the query
 * names exactly and groups everything else under "Close matches": close
 * results must never read as an answer to the query.
 */
export function SearchResultsView({
  results,
  partCards,
  query,
  initialType,
  outcome,
  brandSuggestion,
  candidates,
}: SearchResultsViewProps) {
  const t = useTranslations("SearchResults")
  if (outcome === "served") {
    return (
      <ResultGroups
        products={results.products}
        partCards={partCards}
        brands={results.brands}
        query={query}
        initialType={initialType}
        headingLevel="h2"
      />
    )
  }

  // Unserved (issue #452): the zero-result block comes first, then the
  // products the query names exactly (none has a part), then everything else
  // under "Close matches", so close results never read as an answer.
  const { matchingProducts, closeMatches } = splitUnservedResults(results, partCards)
  const closeCount =
    closeMatches.products.length + closeMatches.partCards.length + closeMatches.brands.length

  return (
    <div className="space-y-xl">
      <UnservedBlock
        outcome={outcome}
        query={query}
        brandSuggestion={brandSuggestion}
        candidates={candidates}
        // A request on the one product the query names is attached to it,
        // as on the product page; with several, the visitor says which.
        requestProductId={matchingProducts.length === 1 ? matchingProducts[0].id : undefined}
      />

      {matchingProducts.length > 0 && (
        <section className="space-y-md">
          <div className="space-y-xs">
            <h2 className="font-heading text-heading-sm font-semibold text-text-primary">
              {t("matchingTitle")}
            </h2>
            <p className="text-body text-text-secondary">{t("matchingDescription")}</p>
          </div>
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            {matchingProducts.map((product) => (
              <ProductResultCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {closeCount > 0 && (
        <section className="space-y-md">
          <div className="space-y-xs">
            <h2 className="font-heading text-heading-sm font-semibold text-text-primary">
              {t("closeTitle")}
            </h2>
            <p className="text-body text-text-secondary">{t("closeDescription", { query })}</p>
          </div>
          <ResultGroups
            products={closeMatches.products}
            partCards={closeMatches.partCards}
            brands={closeMatches.brands}
            query={query}
            initialType={initialType}
            headingLevel="h3"
          />
        </section>
      )}
    </div>
  )
}

interface UnservedBlockProps {
  outcome: SearchMissOutcome
  query: string
  brandSuggestion: BrandSuggestion | null
  candidates: ProductCandidate[]
  requestProductId?: string
}

/**
 * The zero-result block (issues #320, #452): request the part, publish one,
 * and, unless the query fully names a product, attach the query as a
 * reference of the product it belongs to.
 */
function UnservedBlock({
  outcome,
  query,
  brandSuggestion,
  candidates,
  requestProductId,
}: UnservedBlockProps) {
  // The heading and introduction of the block depend on the outcome.
  const t = useTranslations("SearchResults")

  return (
    <div className="max-w-container-md space-y-lg">
      <div className="space-y-sm">
        <h1 className="font-heading text-heading-md font-semibold text-text-primary">
          {t(`unserved.${outcome}.title`, { query })}
        </h1>
        <p className="text-body text-text-secondary">{t(`unserved.${outcome}.intro`)}</p>
      </div>

      {/* A query that fully names a product is its name, not an unknown
          reference: attaching it would only queue a useless suggestion. */}
      {outcome !== "no_parts" && (
        <section className="space-y-sm">
          <h2 className="font-heading text-heading-sm font-semibold text-text-primary">
            {t("attachTitle", { query })}
          </h2>
          <p className="text-body text-text-secondary">{t("attachDescription")}</p>
          <AttachReference reference={query} initialCandidates={candidates} />
        </section>
      )}

      <section className="space-y-sm">
        <h2 className="font-heading text-heading-sm font-semibold text-text-primary">
          {t("requestTitle")}
        </h2>
        <RequestPartForm productId={requestProductId} rawQuery={query} defaultDescription={query} />
      </section>

      <div className="flex flex-wrap items-center gap-sm">
        <Button asChild variant="outline">
          <Link href="/publish">{t("publish")}</Link>
        </Button>
        {brandSuggestion && (
          <Button asChild variant="ghost">
            <Link href={`/brands/${brandSuggestion.slug}`}>
              {t("viewBrand", { brand: brandSuggestion.name })}
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}

interface ResultGroupsProps {
  products: SearchResults["products"]
  /** The part hits as standard part cards, in rank order. */
  partCards: PartCardData[]
  brands: SearchResults["brands"]
  query: string
  initialType: SearchType
  /** h2 for the results of a served search, h3 when nested under "Close matches". */
  headingLevel: "h2" | "h3"
}

/**
 * The grouped results with their type filter: a summary, the type toggles,
 * and one section per type, previewed in the "All" view.
 */
function ResultGroups({
  products,
  partCards,
  brands,
  query,
  initialType,
  headingLevel,
}: ResultGroupsProps) {
  const t = useTranslations("SearchResults")
  const counts = useTranslations("Counts")
  const [activeType, setActiveType] = React.useState<SearchType>(initialType)

  const totals = {
    products: products.length,
    parts: partCards.length,
    brands: brands.length,
  }
  const total = totals.products + totals.parts + totals.brands

  // Update the active type and mirror it into the URL shallowly (no server
  // refetch, no scroll jump) so the filtered view stays shareable.
  const selectType = (type: SearchType) => {
    setActiveType(type)
    const params = new URLSearchParams({ q: query })
    if (type !== "all") params.set("type", type)
    // The current path keeps the locale prefix of the page.
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`)
  }

  const summary = [
    totals.products > 0 && counts("products", { count: totals.products }),
    totals.parts > 0 && counts("parts", { count: totals.parts }),
    totals.brands > 0 && counts("brands", { count: totals.brands }),
  ]
    .filter(Boolean)
    .join(" · ")

  // In the "All" view, hide empty groups. When a specific type is selected,
  // always render its section — even with zero hits — so the page reflects the
  // active filter instead of looking blank.
  const showSection = (type: Exclude<SearchType, "all">) =>
    activeType === type || (activeType === "all" && totals[type] > 0)

  return (
    <div className="space-y-lg">
      <p className="text-body text-text-secondary" aria-live="polite">
        {summary}
      </p>

      {/* Type filter toggles — plain buttons with aria-pressed, not a tab
          widget (there are no tab panels / roving focus to back that up). */}
      <div className="flex flex-wrap gap-sm" role="group" aria-label={t("filterLabel")}>
        {SEARCH_TYPES.map((type) => {
          const count = type === "all" ? total : totals[type]
          const isActive = activeType === type
          return (
            <button
              key={type}
              type="button"
              aria-pressed={isActive}
              onClick={() => selectType(type)}
              className={cn(
                "rounded-full border px-md py-xs text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface",
                isActive
                  ? "border-transparent bg-action-primary/10 text-action-primary"
                  : "border-border-subtle bg-bg-subtle text-text-primary hover:bg-bg-hover",
              )}
            >
              {t(`types.${type}`)}
              <span className="ml-xs text-text-secondary">{count}</span>
            </button>
          )
        })}
      </div>

      {showSection("products") && (
        <ResultSection
          title={t("types.products")}
          headingLevel={headingLevel}
          count={totals.products}
          previewing={activeType === "all"}
          onSeeAll={() => selectType("products")}
          seeAllLabel={t("seeAll", { items: counts("products", { count: totals.products }) })}
        >
          {totals.products > 0 ? (
            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
              {(activeType === "all"
                ? products.slice(0, PREVIEW_COUNT)
                : products
              ).map((product) => (
                <ProductResultCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <SectionEmpty>{t("empty.products", { query })}</SectionEmpty>
          )}
        </ResultSection>
      )}

      {showSection("parts") && (
        <ResultSection
          title={t("types.parts")}
          headingLevel={headingLevel}
          count={totals.parts}
          previewing={activeType === "all"}
          onSeeAll={() => selectType("parts")}
          seeAllLabel={t("seeAll", { items: counts("parts", { count: totals.parts }) })}
        >
          {totals.parts > 0 ? (
            // Same grid as /browse and the home page — search results are the
            // same parts and must not be sized or spaced differently.
            <PartGrid
              parts={activeType === "all" ? partCards.slice(0, PREVIEW_COUNT) : partCards}
            />
          ) : (
            <SectionEmpty>{t("empty.parts", { query })}</SectionEmpty>
          )}
        </ResultSection>
      )}

      {showSection("brands") && (
        <ResultSection
          title={t("types.brands")}
          headingLevel={headingLevel}
          count={totals.brands}
          previewing={activeType === "all"}
          onSeeAll={() => selectType("brands")}
          seeAllLabel={t("seeAll", { items: counts("brands", { count: totals.brands }) })}
        >
          {totals.brands > 0 ? (
            <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
              {(activeType === "all"
                ? brands.slice(0, PREVIEW_COUNT)
                : brands
              ).map((brand) => (
                <BrandResultCard key={brand.id} brand={brand} />
              ))}
            </div>
          ) : (
            <SectionEmpty>{t("empty.brands", { query })}</SectionEmpty>
          )}
        </ResultSection>
      )}
    </div>
  )
}

function SectionEmpty({ children }: { children: React.ReactNode }) {
  return <p className="text-body text-text-secondary">{children}</p>
}

interface ResultSectionProps {
  title: string
  headingLevel: "h2" | "h3"
  count: number
  previewing: boolean
  onSeeAll: () => void
  seeAllLabel: string
  children: React.ReactNode
}

function ResultSection({
  title,
  headingLevel: Heading,
  count,
  previewing,
  onSeeAll,
  seeAllLabel,
  children,
}: ResultSectionProps) {
  return (
    <section className="space-y-md">
      <div className="flex items-center justify-between">
        <Heading className="font-heading text-heading-sm font-semibold text-text-primary">{title}</Heading>
        {previewing && count > PREVIEW_COUNT && (
          <button
            type="button"
            onClick={onSeeAll}
            className="text-sm font-medium text-action-primary transition-colors hover:text-action-primaryHover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
          >
            {seeAllLabel}
          </button>
        )}
      </div>
      {children}
    </section>
  )
}
