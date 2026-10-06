# Products, References and Compatibility Evidence

How a product is identified, and how well a part's fit on it is established.

## Products and references (#316)

A product is a commercial name ("OneBlade Pro", "K 3 Power Control"). People identify their device by what is printed on it, so each product also carries `product_references`:

| `type` | Example | Use |
|---|---|---|
| `manufacturer_ref` | QP6520/20 | Searched by prefix (see [SEARCH.md](./SEARCH.md)) |
| `commercial_name` | a regional name | Shown as the product name in the visitor's region |
| `ean` | barcode | Stored and searchable |

- **Normalization.** `normalize_product_reference()` uppercases and removes spaces, hyphens, slashes and dots: "QP 6520/20", "qp6520-20" and "QP652020" are the same value. The generated `normalized_value` column uses it, and search normalizes queries with the same function.
- **Regional names.** The product page reads the visitor's language and region from the Accept-Language header (`parseAcceptLanguage()` in `lib/utils/locale.ts`) and shows the matching `commercial_name` when one exists (`pickRegionalName()`), otherwise `products.name`. Region never filters search.
- **Writes.** There is no admin role. Curated references are written through the Supabase dashboard or the service role. Visitors can suggest a reference from the zero-result search page; it is stored `pending` and only becomes public once its `status` is set to `validated`.

## Compatibility evidence (#317)

Whether a part fits is a property of the part–product pair, so evidence lives on `part_products`, not on the part:

| `evidence_level` | Meaning |
|---|---|
| `declared` | The source or a curator claims the fit. Default for every link. |
| `confirmed` | At least one positive print report, and no more negative than positive reports. |
| `disputed` | Negative reports outnumber positive ones (a single negative report with no positive one included). |

The rule is one function, `part_product_evidence_level(positive, negative)`. The column is server-owned: the INSERT and UPDATE grants for `anon` and `authenticated` cover only (`part_id`, `product_id`), so an owner cannot self-grant `confirmed`.

`parts.verification_status` is a separate notion about the part as a whole. The interface never conflates the two (principle P-5 in [user-flows.md](./user-flows.md)).

## Print reports (#318)

A one-click report on the part page says whether the printed part worked on one compatible product.

- **Results:** `works` and `works_with_adjustments` count as positive; `does_not_work` counts as negative.
- **One report per reporter per pair.** Reporting again replaces the earlier report; this is also how an optional comment or product reference is added after the one-click result.
- **Reporter identity:** `reporter_hash`, a SHA-256 of a random `cpa_reporter` cookie id (one year), or of the user id when signed in. No IP address is stored.
- **Rate limit:** 20 part–product pairs per reporter per hour; editing an existing report is not limited.
- **Write path:** `POST /api/print-reports` (open to anonymous visitors) → `submit_print_report()`, executable by the service role only. The table has RLS with no policy.
- **Effects:** a trigger recounts the pair after every change, updating `works_count`, `works_with_adjustments_count`, `does_not_work_count`, `evidence_level`, and `parts.makes_count`, which counts every report.
- Comments are stored but not shown publicly; the part page reads the counters on `part_products`.

## Linking products to a part (#222)

A part is linked to up to 50 products, across brands (`VALIDATION_LIMITS.PART.PRODUCTS_MAX_COUNT` in `lib/utils/constants.ts`). The Compatibility step disables the product picker at the limit, and the draft `PATCH` endpoints of both tracks answer 400 above it. Every read of a part's links uses the same bound: draft resume and save, product-name resolution on resume (`GET /api/products?ids=`), and the part page, which lists every linked product.

On the part page, the "Compatible with" card shows each linked product with its brand and its category. A category describes the product, not the part, so the "Part details" card has no category row (#372).

## Product creation

Products are created inline in the publish flow's Compatibility step. `POST /api/products` refuses a case or spacing variant of an existing product name for the same brand and answers 409 with the existing record (`findProductByNormalizedName`, #279). The check runs at the API layer only: two simultaneous case-variant creations can both pass, a known and accepted gap.

## Key files

- `app/(public)/product/[slug]/page.tsx`, `lib/supabase/queries/product-page.ts`
- `app/api/print-reports/route.ts`, `lib/supabase/queries/print-reports.ts`, `lib/utils/print-reports.ts`, `lib/utils/reporter-session.ts`, `lib/utils/evidence-level.ts`
- `app/api/products/route.ts`, `lib/utils/product-references.ts`, `lib/utils/locale.ts`
- Migrations: `20260923120000_product_references.sql`, `20260925120000_part_product_evidence_level.sql`, `20260925180000_print_reports.sql`
