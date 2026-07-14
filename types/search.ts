// Shapes returned by the public.search_all RPC and the GET /api/search endpoint.
// Kept intentionally minimal — only what an autocomplete/search result row needs.

export interface SearchProductResult {
  id: string
  name: string
  slug: string
  image_url: string | null
  category: string | null
  parts_count: number
}

export interface SearchModelResult {
  id: string
  name: string
  slug: string
  part_name: string | null
  part_number: string | null
  thumbnail_url: string | null
  product_name: string | null // a linked product; null => "Generic part"
  author_username: string | null
  license: string | null // license short name, e.g. "CC BY-NC-ND 4.0"
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
  models: SearchModelResult[]
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
  return { products: [], models: [], brands: [] }
}
