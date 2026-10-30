"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PartGrid } from "@/components/part/part-grid"
import { pluralize } from "@/lib/utils/formatters"
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

const TYPE_LABEL: Record<Exclude<SearchType, "all">, string> = {
  products: "Products",
  parts: "Parts",
  brands: "Brands",
}

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

export function SearchResultsView({
  results,
  partCards,
  query,
  initialType,
  outcome,
  brandSuggestion,
  candidates,
}: SearchResultsViewProps) {
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
              Matching products
            </h2>
            <p className="text-body text-text-secondary">
              No part is published for these products yet. Open one to request a part or see what others asked for.
            </p>
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
              Close matches
            </h2>
            <p className="text-body text-text-secondary">
              These results only partly match &ldquo;{query}&rdquo;.
            </p>
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

// Heading (around the quoted query) and introduction of the zero-result
// block, per unserved outcome.
const UNSERVED_COPY: Record<SearchMissOutcome, { titleStart: string; titleEnd: string; intro: string }> = {
  no_results: {
    titleStart: "No parts indexed for",
    titleEnd: " yet",
    intro:
      "The catalog grows with demand. Tell us what you need and requests with the most demand get sourced first.",
  },
  approximate: {
    titleStart: "No exact match for",
    titleEnd: "",
    intro:
      "The results below only partly match your search. Tell us what you need and requests with the most demand get sourced first.",
  },
  no_parts: {
    titleStart: "No parts published for",
    titleEnd: " yet",
    intro:
      "The product is in the catalog, but nobody has published a part for it yet. Tell us what you need and requests with the most demand get sourced first.",
  },
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
  const copy = UNSERVED_COPY[outcome]

  return (
    <div className="max-w-container-md space-y-lg">
      <div className="space-y-sm">
        <h1 className="font-heading text-heading-md font-semibold text-text-primary">
          {copy.titleStart} &ldquo;{query}&rdquo;{copy.titleEnd}
        </h1>
        <p className="text-body text-text-secondary">{copy.intro}</p>
      </div>

      {/* A query that fully names a product is its name, not an unknown
          reference: attaching it would only queue a useless suggestion. */}
      {outcome !== "no_parts" && (
        <section className="space-y-sm">
          <h2 className="font-heading text-heading-sm font-semibold text-text-primary">
            Is &ldquo;{query}&rdquo; printed on your device?
          </h2>
          <p className="text-body text-text-secondary">
            Tell us which product it belongs to and it becomes searchable once checked.
          </p>
          <AttachReference reference={query} initialCandidates={candidates} />
        </section>
      )}

      <section className="space-y-sm">
        <h2 className="font-heading text-heading-sm font-semibold text-text-primary">
          Request the part
        </h2>
        <RequestPartForm productId={requestProductId} rawQuery={query} defaultDescription={query} />
      </section>

      <div className="flex flex-wrap items-center gap-sm">
        <Button asChild variant="outline">
          <Link href="/publish">Publish a part</Link>
        </Button>
        {brandSuggestion && (
          <Button asChild variant="ghost">
            <Link href={`/brands/${brandSuggestion.slug}`}>
              View {brandSuggestion.name}
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
  const [activeType, setActiveType] = React.useState<SearchType>(initialType)

  const counts = {
    products: products.length,
    parts: partCards.length,
    brands: brands.length,
  }
  const total = counts.products + counts.parts + counts.brands

  // Update the active type and mirror it into the URL shallowly (no server
  // refetch, no scroll jump) so the filtered view stays shareable.
  const selectType = (type: SearchType) => {
    setActiveType(type)
    const params = new URLSearchParams({ q: query })
    if (type !== "all") params.set("type", type)
    window.history.replaceState(null, "", `/search?${params.toString()}`)
  }

  const summary = [
    counts.products > 0 && pluralize(counts.products, "product"),
    counts.parts > 0 && pluralize(counts.parts, "part"),
    counts.brands > 0 && pluralize(counts.brands, "brand"),
  ]
    .filter(Boolean)
    .join(" · ")

  // In the "All" view, hide empty groups. When a specific type is selected,
  // always render its section — even with zero hits — so the page reflects the
  // active filter instead of looking blank.
  const showSection = (type: Exclude<SearchType, "all">) =>
    activeType === type || (activeType === "all" && counts[type] > 0)

  return (
    <div className="space-y-lg">
      <p className="text-body text-text-secondary" aria-live="polite">
        {summary}
      </p>

      {/* Type filter toggles — plain buttons with aria-pressed, not a tab
          widget (there are no tab panels / roving focus to back that up). */}
      <div className="flex flex-wrap gap-sm" role="group" aria-label="Filter results by type">
        {SEARCH_TYPES.map((type) => {
          const label = type === "all" ? "All" : TYPE_LABEL[type]
          const count = type === "all" ? total : counts[type]
          const isActive = activeType === type
          return (
            <button
              key={type}
              type="button"
              aria-pressed={isActive}
              onClick={() => selectType(type)}
              className={cn(
                "rounded-full border px-md py-xs text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface",
                isActive
                  ? "border-transparent bg-action-primary/10 text-action-primary"
                  : "border-border-subtle bg-bg-subtle text-text-primary hover:bg-bg-hover",
              )}
            >
              {label}
              <span className="ml-xs text-text-secondary">{count}</span>
            </button>
          )
        })}
      </div>

      {showSection("products") && (
        <ResultSection
          title="Products"
          headingLevel={headingLevel}
          count={counts.products}
          previewing={activeType === "all"}
          onSeeAll={() => selectType("products")}
          seeAllLabel={`See all ${pluralize(counts.products, "product")}`}
        >
          {counts.products > 0 ? (
            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
              {(activeType === "all"
                ? products.slice(0, PREVIEW_COUNT)
                : products
              ).map((product) => (
                <ProductResultCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <SectionEmpty label="products" query={query} />
          )}
        </ResultSection>
      )}

      {showSection("parts") && (
        <ResultSection
          title="Parts"
          headingLevel={headingLevel}
          count={counts.parts}
          previewing={activeType === "all"}
          onSeeAll={() => selectType("parts")}
          seeAllLabel={`See all ${pluralize(counts.parts, "part")}`}
        >
          {counts.parts > 0 ? (
            // Same grid as /browse and the home page — search results are the
            // same parts and must not be sized or spaced differently.
            <PartGrid
              parts={activeType === "all" ? partCards.slice(0, PREVIEW_COUNT) : partCards}
            />
          ) : (
            <SectionEmpty label="parts" query={query} />
          )}
        </ResultSection>
      )}

      {showSection("brands") && (
        <ResultSection
          title="Brands"
          headingLevel={headingLevel}
          count={counts.brands}
          previewing={activeType === "all"}
          onSeeAll={() => selectType("brands")}
          seeAllLabel={`See all ${pluralize(counts.brands, "brand")}`}
        >
          {counts.brands > 0 ? (
            <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
              {(activeType === "all"
                ? brands.slice(0, PREVIEW_COUNT)
                : brands
              ).map((brand) => (
                <BrandResultCard key={brand.id} brand={brand} />
              ))}
            </div>
          ) : (
            <SectionEmpty label="brands" query={query} />
          )}
        </ResultSection>
      )}
    </div>
  )
}

function SectionEmpty({ label, query }: { label: string; query: string }) {
  return (
    <p className="text-body text-text-secondary">
      No {label} match &ldquo;{query}&rdquo;.
    </p>
  )
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
            className="text-sm font-medium text-action-primary transition-colors hover:text-action-primaryHover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg-surface"
          >
            {seeAllLabel}
          </button>
        )}
      </div>
      {children}
    </section>
  )
}
