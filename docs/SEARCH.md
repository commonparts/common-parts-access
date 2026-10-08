# Search

How visitors find a device and its parts by typing what they read on it: a brand, a commercial name, or a manufacturer reference. `/search` owns everything query-related; `/browse` is pure exploration and never carries query-result semantics (see [BROWSE_NAVIGATION.md](./BROWSE_NAVIGATION.md)).

## Surfaces

| Surface | Route | Notes |
|---|---|---|
| Autocomplete | `SearchBar` (hero, navbar) → `GET /api/search?q=&limit=` | From 2 characters. Grouped suggestions (products, parts, brands) and a "see all results" footer. Keystrokes are never logged. |
| Results page | `/search?q=&type=` | Server-rendered. Fetches the capped result groups once; the `type` chips (`all`, products, parts, brands) filter client-side. Part hits are rendered as standard part cards, hydrated by id and in rank order through the shared card query (`fetchPartCardsByIds()`, #380). `robots: noindex, follow`, and excluded from the sitemap. |
| Zero-result state | `/search` | Logs the miss, suggests an exact brand match, and offers the "which product is it?" picker. |
| Demand dashboard | `/dashboard/search-demand` | Signed-in users only. Most frequent misses and the queue of pending references. |

## Matching: `search_all`

One database function returns `{ products, parts, brands }` (migrations `20260925200000_search_by_reference.sql` and `20260926120000_list_products_with_open_requests.sql`).

- **Folding.** Names are compared through `fold_search_text()`: lowercase with Latin accents removed, so "Kärcher" equals "karcher".
- **Token coverage.** Each query token is matched on its own, so word order does not matter. A token counts fully when its compact form (no spaces, dots, slashes or hyphens) appears in the compact document, so "k3" matches "K 3". Otherwise it counts its trigram word similarity from 0.5 up, which tolerates a typo ("karchr").
- **References.** Products also match on validated `product_references.normalized_value` by prefix, the query being normalized with `normalize_product_reference()`. "QP6520" finds QP6520/20 and QP6520/30. The prefix lookup only runs from 3 characters. References of every region are searched. Parts match through the references of the products they fit.
- **Ordering.** Exact reference hits first, then reference prefix hits, then name hits. Within those, the score sums token coverage ×2, full-text rank ×4 and trigram similarity ×1.
- **Visibility.** Every product is searchable, so a visitor can open any device and request its part. A listed product (`is_listed`) gets a +1 bonus over an unlisted one. Brands appear only when they hold a listed product; parts only when published.
- Product hits carry `reference`: the matched reference as displayed, or null for a name match. Part hits carry the `brands` of the products they fit.

## Zero-result searches (#320)

When `/search` returns nothing:

1. The query is logged to `search_misses` (`raw_query`, a generated `normalized_query`, and the visitor's `locale` from Accept-Language). There is no IP, user id or session id. The insert uses the service role; only `/search` logs, never autocomplete.
2. `findExactBrandMatch()` suggests a brand only when the whole query or one token exactly names a brand holding a listed product ("magimix blender" → Magimix).
3. The "which product is it?" picker (`components/search/attach-reference.tsx`) lists candidates from `GET /api/search/candidates?q=` (`search_product_candidates()`), which searches the whole catalog and accepts half the query tokens.
4. Choosing a product sends `POST /api/product-references`. Anonymous visitors may do this. The reference is stored with `status = 'pending'` and `source = 'search'`, and is neither displayed nor matched until validated.

Validation has no admin role: set `product_references.status` to `validated` or `rejected` in the Supabase dashboard. The `/dashboard/search-demand` page lists the pending queue and the top misses (`fetch_pending_product_references()`, `fetch_top_search_misses()`).

## Key files

- `app/api/search/route.ts`, `app/api/search/candidates/route.ts`, `app/api/product-references/route.ts`
- `app/(public)/search/page.tsx`, `components/search/`
- `components/layout/search-bar.tsx`, `hooks/use-search-autocomplete.ts`
- `lib/supabase/queries/search.ts`, `lib/supabase/queries/search-demand.ts`
- `lib/utils/locale.ts` (Accept-Language parsing), `lib/utils/product-references.ts`
- `types/search.ts` (limits and payload types)
