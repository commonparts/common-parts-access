import type { SearchOutcome, SearchProductResult, SearchResults } from '@/types/search'

/** A part hit as rendered on /search: the hydrated card, identified by id. */
interface RenderedPart {
  id: string
}

/**
 * Classifies a search submitted on /search (issue #452).
 *
 * A search is served when at least one hit is a full match (`full_match`,
 * computed by `search_all`) and is either a part or a product with a published
 * part. Close matches (trigram similarity or partial token coverage) never
 * make a search served, so "mini cooper" answered by unrelated "Mini" products
 * counts as unserved. An unserved search is:
 * - `no_results` when nothing is rendered at all;
 * - `no_parts` when a product fully matches but has no published part;
 * - `approximate` otherwise: only close matches.
 *
 * Part hits are read from the rendered cards, not the raw hits: a part
 * unpublished between the search and the card hydration is not shown, so it
 * cannot serve the search either.
 */
export function classifySearch<T extends RenderedPart>(results: SearchResults, partCards: T[]): SearchOutcome {
  const fullPartIds = new Set(results.parts.filter((part) => part.full_match).map((part) => part.id))
  const servedByPart = partCards.some((card) => fullPartIds.has(card.id))
  const servedByProduct = results.products.some((product) => product.full_match && product.parts_count > 0)
  if (servedByPart || servedByProduct) return 'served'

  const total = results.products.length + partCards.length + results.brands.length
  if (total === 0) return 'no_results'

  return results.products.some((product) => product.full_match) ? 'no_parts' : 'approximate'
}

export interface UnservedResults<T extends RenderedPart> {
  /** Products the query fully matches; none has a published part, or the search would be served. */
  matchingProducts: SearchProductResult[]
  /** Everything else, shown under "Close matches". */
  closeMatches: { products: SearchProductResult[]; partCards: T[]; brands: SearchResults['brands'] }
}

/**
 * Splits the results of an unserved search for display: the products the
 * query names exactly, and the close matches. Brands carry no match quality
 * and stay with the close matches; the exact brand suggestion of the
 * zero-result block covers a query that names a brand.
 */
export function splitUnservedResults<T extends RenderedPart>(
  results: SearchResults,
  partCards: T[],
): UnservedResults<T> {
  return {
    matchingProducts: results.products.filter((product) => product.full_match),
    closeMatches: {
      products: results.products.filter((product) => !product.full_match),
      // A rendered full-match part would have served the search.
      partCards,
      brands: results.brands,
    },
  }
}
