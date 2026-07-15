"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ModelCard } from "@/components/model/model-card"
import { pluralize } from "@/lib/utils/formatters"
import { ProductResultCard } from "@/components/search/product-result-card"
import { BrandResultCard } from "@/components/search/brand-result-card"
import { RequestPartForm } from "@/components/part-requests/request-part-form"
import type { BrandSuggestion } from "@/lib/supabase/queries/search"
import {
  SEARCH_TYPES,
  type SearchModelResult,
  type SearchResults,
  type SearchType,
} from "@/types/search"

// How many items each section previews in the "All" view before "See all".
const PREVIEW_COUNT = 4

// Map a lean search hit onto the existing ModelCard shape. Stats are hidden
// (search doesn't return them) so only image, title and author are shown.
function toModelCardModel(model: SearchModelResult) {
  return {
    id: model.id,
    slug: model.slug,
    title: model.name,
    thumbnailUrl: model.thumbnail_url ?? undefined,
    author: { username: model.author_username ?? "unknown" },
    stats: { downloads: 0, likes: 0, views: 0 },
    tags: [] as string[],
    category: "",
    createdAt: new Date(),
  }
}

const TYPE_LABEL: Record<Exclude<SearchType, "all">, string> = {
  products: "Products",
  parts: "Parts",
  brands: "Brands",
}

interface SearchResultsViewProps {
  results: SearchResults
  query: string
  initialType: SearchType
  brandSuggestion: BrandSuggestion | null
}

export function SearchResultsView({
  results,
  query,
  initialType,
  brandSuggestion,
}: SearchResultsViewProps) {
  const [activeType, setActiveType] = React.useState<SearchType>(initialType)

  const counts = {
    products: results.products.length,
    parts: results.models.length,
    brands: results.brands.length,
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

  if (total === 0) {
    return (
      <div className="max-w-container-md space-y-lg">
        <div className="space-y-sm">
          <h1 className="font-heading text-heading-md font-semibold text-text-primary">
            No parts indexed for &ldquo;{query}&rdquo; yet
          </h1>
          <p className="text-body text-text-secondary">
            The catalog grows with demand. Tell us what you need and requests with the
            most demand get sourced first.
          </p>
        </div>

        <RequestPartForm rawQuery={query} defaultDescription={query} />

        <div className="flex flex-wrap items-center gap-sm">
          <Button asChild variant="outline">
            <Link href="/upload">Contribute a model</Link>
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
          count={counts.products}
          previewing={activeType === "all"}
          onSeeAll={() => selectType("products")}
          seeAllLabel={`See all ${pluralize(counts.products, "product")}`}
        >
          {counts.products > 0 ? (
            <div className="grid gap-md sm:grid-cols-2">
              {(activeType === "all"
                ? results.products.slice(0, PREVIEW_COUNT)
                : results.products
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
          count={counts.parts}
          previewing={activeType === "all"}
          onSeeAll={() => selectType("parts")}
          seeAllLabel={`See all ${pluralize(counts.parts, "part")}`}
        >
          {counts.parts > 0 ? (
            <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
              {(activeType === "all"
                ? results.models.slice(0, PREVIEW_COUNT)
                : results.models
              ).map((model) => (
                <ModelCard key={model.id} model={toModelCardModel(model)} showStats={false} />
              ))}
            </div>
          ) : (
            <SectionEmpty label="parts" query={query} />
          )}
        </ResultSection>
      )}

      {showSection("brands") && (
        <ResultSection
          title="Brands"
          count={counts.brands}
          previewing={activeType === "all"}
          onSeeAll={() => selectType("brands")}
          seeAllLabel={`See all ${pluralize(counts.brands, "brand")}`}
        >
          {counts.brands > 0 ? (
            <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-3">
              {(activeType === "all"
                ? results.brands.slice(0, PREVIEW_COUNT)
                : results.brands
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
  count: number
  previewing: boolean
  onSeeAll: () => void
  seeAllLabel: string
  children: React.ReactNode
}

function ResultSection({
  title,
  count,
  previewing,
  onSeeAll,
  seeAllLabel,
  children,
}: ResultSectionProps) {
  return (
    <section className="space-y-md">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-heading-sm font-semibold text-text-primary">{title}</h2>
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
