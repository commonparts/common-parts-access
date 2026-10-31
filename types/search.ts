// Shapes returned by the public.search_all RPC and the GET /api/search endpoint.
// Kept intentionally minimal — only what an autocomplete/search result row needs.

export interface SearchProductResult {
  id: string
  name: string
  slug: string
  image_url: string | null
  category: string | null
  parts_count: number
  // The manufacturer reference or regional name the query matched (issue
  // #319), as displayed; null when the product matched by name.
  reference: string | null
  // Every query token found, a full-text match or a reference hit (issue
  // #452); false for a close match (trigram similarity or partial coverage).
  full_match: boolean
}

export interface SearchPartResult {
  id: string
  name: string
  slug: string
  part_name: string | null
  part_number: string | null
  thumbnail_url: string | null
  product_name: string | null // a linked product; null => "Generic part"
  full_match: boolean // same definition as SearchProductResult.full_match
  // search_all also returns the license, brands, products and product_count
  // of a part hit. They are not read here: the results page renders part hits
  // as standard part cards, hydrated by id through the shared card query
  // (issue #380), and the suggestions show the name and a product only.
}

export interface SearchBrandResult {
  id: string
  name: string
  slug: string
  logo_url: string | null
  product_count: number
}

export interface SearchResults {
  products: SearchProductResult[]
  parts: SearchPartResult[]
  brands: SearchBrandResult[]
}

// Result-page type filter (All / Products / Parts / Brands). Lives here (not in
// the client view) so the server route can validate the `type` param too.
export type SearchType = "all" | "products" | "parts" | "brands"

export const SEARCH_TYPES: SearchType[] = ["all", "products", "parts", "brands"]

export function isSearchType(value: string | undefined): value is SearchType {
  return !!value && (SEARCH_TYPES as string[]).includes(value)
}

// Bounds shared by the query layer and the endpoint.
export const SEARCH_DEFAULT_LIMIT = 5
export const SEARCH_MAX_LIMIT = 20

// Longer queries add cost to websearch_to_tsquery / word_similarity without
// improving autocomplete results — cap defensively to avoid a cheap DoS vector.
export const SEARCH_MAX_QUERY_LENGTH = 100

// Factory (not a shared constant) so each caller gets its own arrays — a shared
// object could be mutated by one caller and leak across requests.
export function emptySearchResults(): SearchResults {
  return { products: [], parts: [], brands: [] }
}

// A product offered by the zero-result "which product is it?" picker (issue
// #320), from the search_product_candidates RPC. Any product, with or without
// a published part.
export interface ProductCandidate {
  id: string
  name: string
  slug: string
  brand_name: string | null
}

export const PRODUCT_CANDIDATES_LIMIT = 6

// Why a search submitted on /search was unserved (issue #452), as stored in
// `search_misses.outcome`. A search is served when a full match is a part or
// a product with a published part; see classifySearch().
export type SearchMissOutcome = "no_results" | "approximate" | "no_parts"

export const SEARCH_MISS_OUTCOMES: SearchMissOutcome[] = ["no_results", "approximate", "no_parts"]

export function isSearchMissOutcome(value: string | undefined): value is SearchMissOutcome {
  return !!value && (SEARCH_MISS_OUTCOMES as string[]).includes(value)
}

export type SearchOutcome = "served" | SearchMissOutcome
