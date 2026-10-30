# Search

How visitors find a device and its parts by typing what they read on it: a brand, a commercial name, or a manufacturer reference. `/search` owns everything query-related; `/browse` is pure exploration and never carries query-result semantics (see [BROWSE_NAVIGATION.md](./BROWSE_NAVIGATION.md)).

## Surfaces

| Surface | Route | Notes |
|---|---|---|
| Autocomplete | `SearchBar` (hero, navbar) → `GET /api/search?q=&limit=` | From 2 characters. Grouped suggestions (products, parts, brands) and a "see all results" footer. Keystrokes are never logged. |
| Results page | `/search?q=&type=` | Server-rendered. Fetches the capped result groups once; the `type` chips (`all`, products, parts, brands) filter client-side. Part hits are rendered as standard part cards, hydrated by id and in rank order through the shared card query (`fetchPartCardsByIds()`, #380). `robots: noindex, follow`, and excluded from the sitemap. |
| Unserved state | `/search` | When no full match with a published part answers the query (#452): logs the miss with its outcome, shows the zero-result block above the results (brand suggestion, "which product is it?" picker, part request), and groups the other results under "Close matches". |
| Demand dashboard | `/dashboard/search-demand` | Curators only (#435). Most frequent misses, filterable by outcome, and the queue of pending references. |

## Matching: `search_all`

One database function returns `{ products, parts, brands }` (migrations `20260925200000_search_by_reference.sql`, `20260926120000_list_products_with_open_requests.sql` and `20261030120000_search_miss_outcomes.sql`).

- **Folding.** Names are compared through `fold_search_text()`: lowercase with Latin accents removed, so "Kärcher" equals "karcher".
- **Token coverage.** Each query token is matched on its own, so word order does not matter. A token counts fully when its compact form (no spaces, dots, slashes or hyphens) appears in the compact document, so "k3" matches "K 3". Otherwise it counts its trigram word similarity from 0.5 up, which tolerates a typo ("karchr").
- **References.** Products also match on validated `product_references.normalized_value` by prefix, the query being normalized with `normalize_product_reference()`. "QP6520" finds QP6520/20 and QP6520/30. The prefix lookup only runs from 3 characters. References of every region are searched. Parts match through the references of the products they fit.
- **Match quality (#452).** A hit is a full match when it is a reference hit, when every query token is found (token coverage of 1), or when the whole query matches in full text. A hit that only passes the trigram threshold (whole-query word similarity above 0.3) or covers part of the tokens is a close match. Product and part hits carry this as `full_match`. A token matched only through the typo tolerance counts its similarity, below 1, so a query with a typo ("dysn v10") only gets close matches.
- **Ordering.** Exact reference hits first, then reference prefix hits, then name hits. Within those, full matches come before close matches, and the score sums token coverage ×2, full-text rank ×4 and trigram similarity ×1. Parts are ordered by match quality, then score.
- **Visibility.** Every product is searchable, so a visitor can open any device and request its part. A listed product (`is_listed`) gets a +1 bonus over an unlisted one. Brands appear only when they hold a listed product; parts only when published.
- Product hits carry `reference`: the matched reference as displayed, or null for a name match. Part hits carry the `brands` of the products they fit.

## Unserved searches (#320, #452)

A search submitted on `/search` is **served** when at least one hit is a full match and is either a part or a product with a published part (`parts_count > 0`). Close matches never serve a search: "mini cooper" returns "Mini" products and hair clipper combs, none of which covers both words. `classifySearch()` (`lib/utils/search-outcome.ts`) reads `full_match` from the hits; it counts parts on the hydrated cards, so a part unpublished in between does not serve the search. An unserved search has one of three outcomes:

| Outcome | When |
|---|---|
| `no_results` | Nothing is returned. |
| `approximate` | Only close matches are returned. |
| `no_parts` | A product fully matches the query but has no published part ("Mac mini M2"). |

When a search is unserved:

1. The query is logged to `search_misses` (`raw_query`, a generated `normalized_query`, the `outcome`, and the visitor's `locale` from Accept-Language). There is no IP, user id or session id. The insert uses the service role; only `/search` logs, never autocomplete.
2. The zero-result block comes first, with a heading per outcome. Below it, a `no_parts` search lists the fully matching products under "Matching products", and every other result is grouped under "Close matches", with the type filter.
3. `findExactBrandMatch()` suggests a brand only when the whole query or one token exactly names a brand holding a listed product ("magimix blender" → Magimix).
4. The "which product is it?" picker (`components/search/attach-reference.tsx`) lists candidates from `GET /api/search/candidates?q=` (`search_product_candidates()`), which searches the whole catalog and accepts half the query tokens. It is not offered for `no_parts`: the query names a product, it is not an unknown reference.
5. Choosing a product sends `POST /api/product-references`. Anonymous visitors may do this. The reference is stored with `status = 'pending'` and `source = 'search'`, and is neither displayed nor matched until validated.
6. The part request form stores the query as `raw_query`. When a `no_parts` search names exactly one product, the request is attached to that product, as on the product page.

Validation has no admin role: set `product_references.status` to `validated` or `rejected` in the Supabase dashboard. The `/dashboard/search-demand` page lists the pending queue and the top misses (`fetch_pending_product_references()`, `fetch_top_search_misses(since_days, result_limit, outcome_filter)`). Misses are grouped by `normalized_query`; the group shows its latest spelling and latest outcome, and counts every miss of the window whatever its outcome. The `?outcome=` filter keeps the groups whose latest outcome matches.

**Curator access (#435).** Sign-up is open and the misses are free text typed by visitors, so the dashboard is not open to every signed-in user. Curators are listed by Supabase user id in the server-only `CURATOR_USER_IDS` environment variable (comma-separated; unset or empty means nobody), checked by `isCurator()` in `lib/auth/permissions.ts`. Any other user, signed in or not, gets the not-found page. The page then calls both RPCs with the service role (`lib/supabase/admin.ts`). Set it on every Railway environment that serves the dashboard: while it is unset, the page is not found for everyone.

## Key files

- `app/api/search/route.ts`, `app/api/search/candidates/route.ts`, `app/api/product-references/route.ts`
- `app/(public)/search/page.tsx`, `components/search/`
- `components/layout/search-bar.tsx`, `hooks/use-search-autocomplete.ts`
- `lib/supabase/queries/search.ts`, `lib/supabase/queries/search-demand.ts`
- `lib/auth/permissions.ts` (curator check of the demand dashboard)
- `lib/utils/locale.ts` (Accept-Language parsing), `lib/utils/product-references.ts`, `lib/utils/search-outcome.ts` (served or unserved, and the outcome)
- `types/search.ts` (limits and payload types)
