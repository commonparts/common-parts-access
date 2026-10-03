# SEO

Most traffic is expected from search engines and direct links, so every public page must stand alone as an entry point (principle P-4 in [user-flows.md](./user-flows.md)). Builders live in `lib/utils/seo.ts`.

## Metadata per page

| Page | Title pattern | Description | Structured data |
|---|---|---|---|
| `/parts/[slug]` | Part name + the brand and product it fits | Leads with brand and product name, then the part's description | `3DModel` + `BreadcrumbList` |
| `/product/[slug]` | "Bosch MUM5 spare parts", using the regional commercial name when one matches the visitor | Brand, product and category name; no count, since the page also invites part requests | `BreadcrumbList` |
| `/brands/[brand]` | "Bosch spare parts" | Brand name and the parts count | `BreadcrumbList` |
| `/brands/[brand]/[category]` | "Bosch Dishwashers spare parts" | Brand, category and counts | `BreadcrumbList` |
| `/categories/[slug]` | "Vacuum Cleaner spare parts" | Subtree counts when parts exist, generic copy otherwise | `BreadcrumbList` |
| `/search` | — | — | none; `robots: noindex, follow` |

- Descriptions stay within about 155 characters.
- A zero-part brand or category gets generic description copy rather than "0 parts" in a search snippet. On-page counts still show zeros.
- Canonical URLs come from the `*CanonicalPath()` helpers. Paginated listings never put `page` in the canonical.
- Since #315 a part has no brand of its own: the brand in its title comes from the first linked product, and a part with no product has none.

## Structured data

- **Part pages use `3DModel`, not `Product`.** Parts are free printable files with no offer or price, so `Product` markup would not qualify for rich results and would misrepresent the page. The `BreadcrumbList` alongside it is the supported rich result.
- **Attribution (P-2):** the creator is the original author for curated parts, falling back to the uploader. The license links to the effective license text (source license first).
- `serializeJsonLd()` escapes `<`, so user-supplied names and descriptions cannot close the script element.

## Sitemap and robots (#257)

- `/sitemap.xml` (`app/sitemap.ts`) lists only what public navigation shows: brand pages, category pages, brand-scoped category listings, product pages and part pages (`buildSitemapPaths()` in `lib/utils/sitemap.ts`). Rendered dynamically, since it reads the catalog through the cookie-based server client.
- `/robots.txt` (`app/robots.ts`) allows everything and points to the sitemap. Nothing is disallowed, on purpose: crawlers must fetch `/search` pages to read their `noindex` tag, and part pages render their details client-side from `/api/parts/[slug]/details`, so blocking `/api/` would keep crawlers from rendering them.
- Absolute URLs are built with `absoluteAppUrl()` (`lib/utils/validation.ts`).

## Key files

- `lib/utils/seo.ts`, `lib/utils/sitemap.ts`, `app/sitemap.ts`, `app/robots.ts`
- `generateMetadata` in each page under `app/(public)/`
