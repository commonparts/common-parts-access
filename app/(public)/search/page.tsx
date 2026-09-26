import type { Metadata } from "next"
import { headers } from "next/headers"
import { Section } from "@/components/layout/section"
import { Container } from "@/components/layout/container"
import { SearchBar } from "@/components/layout/search-bar"
import { SearchResultsView } from "@/components/search/search-results-view"
import { findExactBrandMatch, searchAll, type BrandSuggestion } from "@/lib/supabase/queries/search"
import { logSearchMiss, searchProductCandidates } from "@/lib/supabase/queries/search-demand"
import { formatLocaleTag, parseAcceptLanguage } from "@/lib/utils/locale"
import { isSearchType, SEARCH_MAX_LIMIT, SEARCH_MAX_QUERY_LENGTH, type ProductCandidate } from "@/types/search"

export const metadata: Metadata = {
  title: "Search",
}

// Read q as the first value whether the param arrives as a string or string[].
function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ""
  return value ?? ""
}

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

  const total = results.products.length + results.parts.length + results.brands.length
  const isMiss = Boolean(query) && total === 0

  // A zero-result search is logged (issue #320) and offers the products the
  // query may name, so the visitor can attach an unknown reference to one.
  // Only this page logs: /api/search serves autocomplete keystrokes.
  let brandSuggestion: BrandSuggestion | null = null
  let candidates: ProductCandidate[] = []
  if (isMiss) {
    const locale = parseAcceptLanguage((await headers()).get("accept-language"))
    ;[brandSuggestion, candidates] = await Promise.all([
      findExactBrandMatch(query),
      // The picker is optional: without candidates the visitor can still
      // search for the product or request the part.
      searchProductCandidates(query).catch((): ProductCandidate[] => []),
      logSearchMiss(query, formatLocaleTag(locale)),
    ])
  }

  return (
    <Section>
      <Container size="xl" className="space-y-xl">
        <SearchBar defaultValue={query} className="max-w-container-md" />

        {query ? (
          <SearchResultsView
            results={results}
            query={query}
            initialType={initialType}
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
