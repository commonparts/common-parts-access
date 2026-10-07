# Browse Navigation

Device-based navigation (Flow P2 in [user-flows.md](./user-flows.md)): a visitor who thinks in terms of their appliance reaches its parts through categories and brands. Every navigation page is a server-rendered, crawlable entry point with a breadcrumb and its own metadata (see [SEO.md](./SEO.md)).

## Routes

| Route | Content | Data |
|---|---|---|
| `/browse` | Hub: level-0 categories with subtree counts and example leaves, brand entries, and the filterable parts grid. | `fetch_browse_nav()`; grid over `GET /api/parts` (20 per page) |
| `/categories/[slug]` | Drill-down at any depth: direct children with subtree counts and, when the category has products of its own, the brands covering them. | `fetch_category_page()` |
| `/brands/[brand]` | Covered categories and the brand's products with part counts, paginated. Text-only brand name, no logo. | `fetch_brand_nav()` |
| `/brands/[brand]/[category]` | A brand's products within one category, paginated. Target of the category crumb on product pages. | `fetchBrandCategoryListing()` |
| `/product/[slug]` | Product page: compatible parts, newest first and paginated (20 per page, #373), open part requests, regional name. | `lib/supabase/queries/product-page.ts` |
| `/parts/[slug]` | Part page (Flow P1). | `lib/supabase/queries/part.ts` |

Breadcrumb on product pages: `Brand › Category › Product`. The brand crumb resolves to `/brands/[brand]`, the category crumb to `/brands/[brand]/[category]`.

## Availability semantics

Navigation shows only what has something to offer (#312, #321):

- A product is **listed** when it has a published part or an open part request (`products.is_listed`).
- A brand or category is surfaced when its subtree holds a listed product.
- **Counts stay parts-only.** Part counts are distinct published parts per node, so a part fitting several products counts once. Product counts count products with a published part only. A brand listed through a request alone reads "0 parts across 0 products".
- **Direct URLs never dead-end.** A known brand, category or brand-scoped listing with nothing listed still renders, with an availability notice and an upward link. Only unknown slugs return 404.
- Counts are shown as they are, low numbers included.

## Behaviour details

- **Subtree membership** is a `starts_with()` check on `categories.path`. Paths end with a slash, so `/cook/` never matches `/cooker/`.
- **Single-child chains collapse**: when a category has exactly one child and nothing else to show, its page renders the descendant's content, so a click never reveals a single option.
- **Paginated listings** keep one canonical URL without the `page` parameter. A missing, malformed or non-positive `page` reads as page 1, and so does a page past the last one: the brand listings, the product page and `GET /api/parts` re-query page 1 instead of failing (`fetchPageOrFirst` in `lib/utils/pagination.ts`, #383). `GET /api/parts` reports the page it returned in `pagination.page`.
- **The hub degrades**: if the navigation function is unavailable, `/browse` renders an empty navigation (the sections hide themselves) and keeps the parts grid.
- **Grid filters** (category, brand, product, sort) are exploration tools. The grid defaults to newest first; there is no download-based sort (#373). The "Most liked" sort is hidden with the social features flag (#322).
- All navigation functions are `SECURITY INVOKER` and filter on `parts.status = 'published'`, so anonymous and signed-in visitors see identical counts.

## Key files

- `app/(public)/browse/page.tsx`, `app/(public)/categories/[slug]/page.tsx`, `app/(public)/brands/[brand]/page.tsx`, `app/(public)/brands/[brand]/[category]/page.tsx`
- `components/browse/`
- `lib/supabase/queries/browse-nav.ts`, `category-page.ts`, `brand-page.ts`
- `lib/utils/pagination.ts`: page ranges and the out-of-range fallback shared by every paginated listing
- Migrations: `20260715192445_browse_nav_function.sql`, `20260716181406_category_drilldown_nav.sql`, `20260922120000_hide_entities_without_parts.sql`, `20260926120000_list_products_with_open_requests.sql`
