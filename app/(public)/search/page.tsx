import type { Metadata } from "next"
import { Section } from "@/components/layout/section"
import { Container } from "@/components/layout/container"
import { SearchBar } from "@/components/layout/search-bar"
import { SearchResultsView } from "@/components/search/search-results-view"
import { findExactBrandMatch, searchAll } from "@/lib/supabase/queries/search"
import { isSearchType, SEARCH_MAX_LIMIT } from "@/types/search"

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
  const query = firstParam(params.q).trim()
  const typeParam = firstParam(params.type)
  const initialType = isSearchType(typeParam) ? typeParam : "all"

  // Fetch the full result groups (capped) once, server-side; the client view
  // handles type filtering without another round-trip.
  const results = query
    ? await searchAll(query, SEARCH_MAX_LIMIT)
    : { products: [], models: [], brands: [] }

  const total = results.products.length + results.models.length + results.brands.length
  const brandSuggestion = query && total === 0 ? await findExactBrandMatch(query) : null

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
