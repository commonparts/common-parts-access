import type { Metadata } from "next"
import { headers } from "next/headers"
import { Section } from "@/components/layout/section"
import { Container } from "@/components/layout/container"
import { SearchBar } from "@/components/layout/search-bar"
import { SearchResultsView } from "@/components/search/search-results-view"
import { findExactBrandMatch, searchAll, type BrandSuggestion } from "@/lib/supabase/queries/search"
import { logSearchMiss, searchProductCandidates } from "@/lib/supabase/queries/search-demand"
import { fetchPartCardsByIds } from "@/lib/supabase/queries/part"
import { formatLocaleTag, parseAcceptLanguage } from "@/lib/utils/locale"
import { classifySearch } from "@/lib/utils/search-outcome"
import { isSearchType, SEARCH_MAX_LIMIT, SEARCH_MAX_QUERY_LENGTH, type ProductCandidate } from "@/types/search"

// Result pages are query variants, not entry points (issue #257): kept out of
// the index and the sitemap, while their links stay followable.
export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
}

// Read q as the first value whether the param arrives as a string or string[].
function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ""
  return value ?? ""
}

/**
 * The search results page. Runs the search once server-side, hydrates the part
 * hits as standard cards, and classifies the search as served or unserved on
 * those cards (issue #452). An unserved search is logged in `search_misses`
 * and gets the zero-result block; this page is the only place that logs, as
 * autocomplete keystrokes go through /api/search.
 */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  // Bounded once here, so the search, the logged miss and an attached
  // reference all use the same value; the URL itself has no length limit.
  const query = firstParam(params.q).trim().slice(0, SEARCH_MAX_QUERY_LENGTH).trim()
  const typeParam = firstParam(params.type)
  const initialType = isSearchType(typeParam) ? typeParam : "all"

  // Fetch the full result groups (capped) once, server-side; the client view
  // handles type filtering without another round-trip.
  const results = query
    ? await searchAll(query, SEARCH_MAX_LIMIT)
    : { products: [], parts: [], brands: [] }

  // Part hits are rendered as the standard part card (issue #380): hydrated
  // through the shared card query, by id and in rank order, in one query
  // bounded by the number of hits (at most SEARCH_MAX_LIMIT).
  const partCards = await fetchPartCardsByIds(results.parts.map((part) => part.id))

  // A search is served only by a full match that is a part or a product with
  // a published part (issue #452); close matches alone leave it unserved.
  // Classified on the hydrated cards, as the view renders them: a hit
  // unpublished between the search and the hydration must not serve it.
  const outcome = query ? classifySearch(results, partCards) : "served"

  // An unserved search is logged with its outcome (issues #320, #452) and
  // offers the zero-result block: the brand the query names, and the
  // products it may name, so the visitor can attach an unknown reference to
  // one. Only this page logs: /api/search serves autocomplete keystrokes.
  // A query that fully names a product without parts (no_parts) gets no
  // picker: the matching product is listed, and the query is its name, not
  // an unknown reference.
  let brandSuggestion: BrandSuggestion | null = null
  let candidates: ProductCandidate[] = []
  if (outcome !== "served") {
    const locale = parseAcceptLanguage((await headers()).get("accept-language"))
    ;[brandSuggestion, candidates] = await Promise.all([
      findExactBrandMatch(query),
      // The picker is optional: without candidates the visitor can still
      // search for the product or request the part.
      outcome === "no_parts"
        ? Promise.resolve([])
        : searchProductCandidates(query).catch((): ProductCandidate[] => []),
      logSearchMiss(query, formatLocaleTag(locale), outcome),
    ])
  }

  return (
    <Section>
      <Container size="xl" className="space-y-xl">
        <SearchBar defaultValue={query} className="max-w-container-md" />

        {query ? (
          <SearchResultsView
            results={results}
            partCards={partCards}
            query={query}
            initialType={initialType}
            outcome={outcome}
            brandSuggestion={brandSuggestion}
            candidates={candidates}
          />
        ) : (
          <p className="text-body text-text-secondary">
            Search for a product, part, or brand to see results.
          </p>
        )}
      </Container>
    </Section>
  )
}
