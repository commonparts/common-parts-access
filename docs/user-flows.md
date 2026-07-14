# Common Parts Access — Priority User Flows

**Version:** 1.2 — July 2026
**Status:** Internal working document — basis for GitHub issue breakdown
**Scope:** Phase 0 (Bootstrap). Excludes CPSP, brand portal, community contributions.
**Changes in 1.2:** Updated for the flat product schema: parts link directly to products, with no product families or variants. Retains the search-flow batch alignment for `compatibility_status` on `model_products`, dedicated `part_requests` demand capture, `/search` results page, product page redesign, and the strict `/search` / `/browse` separation.

---

## 0. Related work: the search-flow batch

The universal search flow has its own issue batch, which this document builds on and does not respecify. That batch owns:

- **Schema**: products are the direct compatibility targets for parts, linked through `model_products`, which stores `compatibility_status` (`declared` / `verified`). There is no product hierarchy or product variants. Migration validated and executed by the human.
- **Search backend**: multi-entity full-text search endpoint (`GET /api/search?q=`) over models, products, and brands, with typo tolerance.
- **`parts_count`** denormalized on `products` for their directly linked parts.
- **Part requests**: demand capture in a dedicated `part_requests` table (`POST /api/part-requests`), anonymous submission allowed, aggregated per product. Part requests are demand *data*: they never create GitHub issues and are separate from the feedback/triage pipeline.
- **Frontend**: grouped autocomplete on the existing SearchBar, the `/search` results page, and the **product page redesign** (identification header, compatibility badges, request capture, empty states with demand badge).

Three invariants from that batch constrain everything below:

- **Products are created and maintained during curation.** Contributors never create product records. The curation flow (P3) therefore owns product management.
- **The product is both the navigation and compatibility object.**
- **`/search` owns query results; `/browse` is pure exploration.** "See all" expansions on `/search` stay on `/search` (type chips). No `/search` element links to `/browse`, and `/browse` never carries query-result semantics.

## 1. Framing

### 1.1 Phase objective

The Phase 0 → 1 transition trigger is: first external funding **and** more than 100 parts in the index. The flows prioritised here serve both conditions directly:

- The public flows (P1, P2) make the index usable and credible — the condition for adoption by makers and for demonstration to funders.
- The internal flow (P3) is the operational bottleneck on the path to 100 parts.

### 1.2 Cross-cutting principles

These principles apply to all flows and settle recurring debates once and for all.

**P-1 — No account required to browse or download.** Downloads are anonymous. Download counting is done without identification (server-side counter, no individual tracking). Any sign-up friction in Phase 0 is unjustifiable: no visitor-facing feature requires it.

**P-2 — Attribution is an interface element, not a legal footnote.** Original author, source platform, source link, and license are visible above the fold on the part page and restated at download time. This is the trust condition for the maker audience, which checks these points systematically.

**P-3 — Status honesty beats the appearance of completeness.** An unverified part displays "Unverified". A missing print setting displays "Not documented". A compatibility that has not been verified on a product displays as declared, never as verified. No hidden empty fields, no invented data. Informational tone, never promotional (per brand guidelines).

**P-4 — Every public page is an entry point.** Phase 0 traffic will come mostly from search engines and direct links, not from the homepage. Every part page, product page, brand page, and category page must stand alone: full context, upward navigation (breadcrumb), clean SEO metadata. Consequence: navigation pages are server-rendered crawlable routes — client-side filter states do not qualify as entry points.

**P-5 — Two notions of "verified" coexist and must never be conflated.** *Part verification* concerns the part itself (`unverified` / `author_tested` / `community_validated`). *Compatibility status* concerns a part–product link (`declared` / `verified`, from `model_products`). The interface always makes clear which one is displayed.

**P-6 — Demand and reports are different mechanisms.** Part requests are demand data (`part_requests` table, aggregated, never GitHub issues). Reports are actionable curation work (feedback + triage pipeline, always reaching the human as a GitHub issue). The two are never merged.

---

## 2. Flow P1 — Part detail and download

### 2.1 Objective

Convert an arrival on a part page (from search, navigation, or an external link) into a file download, with attribution and license transmitted correctly.

### 2.2 Entry points

- Grouped autocomplete or `/search` results page (search-flow batch)
- Parts grid on a product page (search-flow batch)
- Navigation pages (Flow P2)
- Direct link / external search engine result
- Canonical URL: `/parts/[slug]` (or existing `/models/[slug]` structure — to be decided, see §5)

### 2.3 Nominal path

1. **Arrival on the page.** The user immediately sees, above the fold:
   - Part title
    - **Compatibility block**, consistent with the product page redesign badges:
       - Product-level entries: "Fits {product name}" where `compatibility_status = 'declared'`
       - "Verified on {product name}" where `compatibility_status = 'verified'`
   - Photo (of the actual print if available, otherwise a render of the model, with an explicit label indicating the image type)
   - Part verification status: `Unverified` / `Author tested` / `Community validated` — visually distinct from compatibility badges (P-5)
   - Attribution block: original author (link), source platform (link), license (badge + link to the license text)
   - Primary download button

2. **Detail review.** Below the fold:
   - Print settings (material, infill, supports) — missing fields displayed as "Not documented"
   - Assembly instructions if available
   - File list: name, format (STL / 3MF / STEP), size
   - Description

3. **Download.**
   - Click on the button → if multiple files, choose a file or "download all" (archive)
   - A non-blocking license notice is shown at download trigger: license, author, attribution obligation where applicable (one line, no consent modal — inform, don't make people sign)
   - The file is served from Common Parts storage (files are hosted, not linked — decision already made)
   - Server-side, anonymous download counter increment; the counter is exposed in the model query layer (consumed by part cards on product pages)

4. **Post-download.** No interruption. The part page remains displayed.

### 2.4 Edge cases and states

| Case | Behaviour |
|---|---|
| Part flagged `needs_legal_review` | Page not published. URL returns 404 (no public "pending" page). |
| CC-BY-SA license | The license notice explicitly mentions the ShareAlike clause. |
| Source file hosted elsewhere (ND license or hosting declined) | Not applicable in Phase 0: curation criteria exclude these cases. If the case arises, the part does not enter the index. |
| Missing photo | 3D render or neutral placeholder with the note "Photo of the printed result not available". Never an image of a different part. |
| Part has only declared product compatibility | Compatibility block shows only "Fits {product}" — no verified claim is fabricated. |
| Part unpublished after external indexing | 410 Gone with a sober message and a link to a linked product page. |

### 2.5 Attached micro-flow: reporting

A discreet "Report a problem" link on every part page. Implementation reuses the existing `feedback` table and triage pipeline with a new `report` type (payload: part URL / model ID, report category — attribution, license, safety, dead link, other — free text). Triage maps `report` to `agent:pm` with a dedicated label; license and safety reports are flagged for priority handling.

Per P-6, this is deliberately **not** the `part_requests` mechanism: a report is actionable curation work that must reach the human as a GitHub issue, whereas a part request is demand data that never does. Covered cases: attribution error, dubious license, unsafe part, dead source link. **Near-zero development cost, high trust value.**

### 2.6 Definition of done

- A page is complete and honest with the minimal dataset from the curation checklist (every `needs_*` flag has a defined display state)
- Declared and verified product compatibility render with the correct badge semantics; part verification and compatibility status are visually distinct
- Download works without an account, counter increments and is queryable per model
- Attribution and license visible without scrolling on desktop and mobile
- SEO metadata: title, description (including brand and product name), Open Graph, schema.org structured data (`Product` or `3DModel`)

### 2.7 Metrics

- Page → download conversion rate
- Entry source breakdown (search / navigation / external)
- Report volume by type

---

## 3. Flow P2 — Device-based navigation

### 3.1 Objective

Allow a user who thinks in terms of their appliance ("my Bosch series X dishwasher") to find available parts without knowing the part's vocabulary. Simultaneously build the structure of search-engine-indexable pages — the main acquisition channel in Phase 0.

### 3.2 Structure

The navigation is built **into the existing `/browse`**, not next to it: a separate brands index alongside `/browse` would create two competing catalog entry points.

The separation with `/search` is strict and bidirectional: `/browse` is pure exploration in categories and brands; `/search` owns everything query-related, including "see all" expansions (handled on `/search` via type chips). `/browse` never receives query-result traffic and no `/browse` element carries query-result semantics.

```
/browse                      → navigation hub: entry by category and by brand
                               (+ the existing filterable parts grid)
/brands/[brand]              → brand page: covered categories and products,
                               with part counts
/brands/[brand]/[category]   → category listing scoped to a brand
/products/…                  → product pages
                               (search-flow batch — not respecified here)
/parts/[slug]                → part page (Flow P1)
```

Breadcrumb per the product page redesign: `Brand › Category › Product`. This flow implements the brand and category link targets; the brand crumb resolves to `/brands/[brand]`, the category crumb to `/brands/[brand]/[category]`.

**Products are the navigation objects.** Brand and category pages list products directly.

### 3.3 Nominal path

1. **Entry.** From the header ("Browse Parts"), from a breadcrumb on a product or part page, or directly from an external search engine onto a brand or category page.
2. **`/browse` hub.** Category and brand entry navigation (lists/tiles with `parts_count` aggregates), alongside the existing filterable grid. The hub links into the dedicated routes below; it does not replace them with client-side filter states.
3. **Brand page.** Covered categories and products, with a part count per product. Text-only brand names — no logos (rights question not settled, see §5).
4. **Category listing.** Products of the brand within the category. Primary SEO target alongside product pages ("spare part [brand] [category]").
5. **Exit** to a product page (search-flow batch) or directly to a part page (Flow P1).

### 3.4 Edge cases and states

| Case | Behaviour |
|---|---|
| Brand with a single part | Normal brand page. No automatic redirect — the page must exist for SEO and to grow. |
| Brand with no remaining published parts | Page kept with "No parts currently available" as long as the brand has existed in the index; otherwise 404. |
| Product part counts | `parts_count` on a product includes its directly linked parts (denormalized, search-flow batch — no per-row count queries). |
| Sparse index (early Phase 0 reality) | Counts are displayed as-is. Do not hide low numbers — consistent with the rule "communicate slightly below the actual level of progress". |
| Empty product pages, part requests, demand badges | Owned by the product page redesign issue (search-flow batch) — not respecified here. |

### 3.5 Data dependency

This flow requires clean, canonical brand and product entities. The schema is established by the search-flow batch; entity selection, controlled creation and the deduplication audit of existing records are handled by the curation entity layer (Flow P3, §4.3 step 4). **P2 does not launch before that audit is done.**

### 3.6 Definition of done

- `/browse` exposes category and brand navigation generated from the database, alongside the filterable grid
- `/brands/[brand]` and `/brands/[brand]/[category]` are server-rendered, crawlable pages
- Breadcrumb links on product pages resolve to these pages without dead ends
- Products appear as single navigation entries; their counts represent directly linked parts
- No `/browse` element carries query-result semantics
- Navigation pages indexable: sitemap, metadata, BreadcrumbList structured data

### 3.7 Metrics

- Inbound organic traffic per brand and category page
- Navigation depth (hub → brand → category → product → part → download)

---

## 4. Flow P3 — Internal curation (semi-automated tool)

### 4.1 Objective

Reduce curation time per part by turning the manual markdown checklist into a tooled flow: pre-fill from the source URL, validation of blocking criteria, entity assignment, record creation and file upload in a single session. Target: from roughly 45 minutes to roughly 10–15 minutes per part.

### 4.2 Scope and access

Internal interface, behind authentication, restricted to the curator role (solo-operated in Phase 0). Route under the protected `(dashboard)` group. This flow does not prefigure the public publishing flow — it will inform it later, but it assumes shortcuts (trust in the operator) that a public flow will never be able to afford.

Curation additionally owns two responsibilities assigned to it by the search-flow batch: **product management** (contributors never create product records) and **compatibility status assignment**.

### 4.3 Nominal path

1. **Source URL entry.** The curator pastes the Printables / Thingiverse / GitHub URL.
2. **Pre-fill.** The system retrieves whatever is extractable: title, author, author URL, declared license, publication date, images, listed files. Every pre-filled field is marked as such and remains editable. What cannot be extracted stays empty. *(Automated extraction pending a ToS decision — see §5; manual fallback exists in all cases.)*
   - Immediate check: duplicate on `source_url` (unique constraint already in the database) → block with a link to the existing part.
3. **Integrated blocking checklist.** Identical to the criteria of curation checklist v1: eligibility, product target, license (SPDX whitelist, NC/ND excluded), file, attribution, duplicate. One unchecked criterion = publication impossible. Rejections are recorded with their reason (rejection traceability).
4. **Entity assignment** (via the curation entity layer):
   - Brand: autocomplete on existing brands; creation requires explicit confirmation.
   - Product: autocomplete scoped to the brand; creation requires explicit confirmation. Product records are standalone.
   - **Compatibility status** per linked product: `declared` by default; `verified` only with print evidence on that exact product. A part may be linked to one or more products, each with its own declared or verified status.
   - This step is where the data cleanliness that P2 depends on is decided.
5. **Demand context.** Open entries from the dedicated `part_requests` table matching the selected product are displayed read-only (via the existing aggregation query), so curation can be steered by captured demand. Closing the loop demand → curation costs nothing: the data and query exist (search-flow batch).
6. **Non-blocking flags.** Verification / print settings / photo / instructions / category — each unchecked box sets the corresponding `needs_*` flag on the record.
7. **Files.** Upload of the 3D files to storage (the license permitting hosting is already guaranteed by the checklist). Format check (STL / 3MF / STEP) and open-ability check.
8. **Review and publish.** Summary screen = the page as it will appear, including compatibility badges. One-click publish, or save as draft.

### 4.4 Edge cases

| Case | Behaviour |
|---|---|
| Extraction impossible (protected page, unknown structure) | Fall back to fully manual entry. The tool never blocks on an extraction failure. |
| Declared license ambiguous or suspicious context | `needs_legal_review` flag can be set manually, with a mandatory justification field. The part is saved but not publishable. |
| Curator tempted to mark compatibility `verified` without print evidence on the exact reference | Not permitted: `verified` requires reference-specific print evidence. When in doubt, `declared`. (P-3, P-5.) |
| Interrupted session | Persistent draft. A curation session is never lost. |
| Platform with ToS restricting scraping | To be verified per platform before implementing automated extraction (see §5). The manual fallback exists in all cases. |

### 4.5 What this flow does not do

- No bulk import. Curation remains unitary and judged — that is the positioning (curated registry, not aggregator).
- No automatic publication without going through the review screen.
- No public exposure of the tool or its scraping code until the source platforms' ToS question is settled.
- No automated product matching: product assignment remains a human judgment call.

### 4.6 Definition of done

- A typical Printables part is curated and published in under 15 minutes
- A part failing any blocking criterion cannot be published
- A part can be linked to one or more products with the correct compatibility status in a single session
- No duplicate brand/product entities can be created through the normal flow; existing records audited and deduplicated
- Every record created carries the full field mapping of checklist v1 (no information loss compared to the manual process)
- Rejections are traced with a reason

### 4.7 Metrics

- Median curation time per part
- Rejection rate and reason breakdown
- Share of curated parts matching an open part request
- Progress toward the 100-part target (phase metric)

---

## 5. Open decisions

To be settled before or during development. None blocks the start of P1 development, but §5.1 must be settled before P1 ships.

1. **Public naming: models vs parts.** Existing code uses `models` (table, routes, and the search endpoint's grouped payload `{ products, models, brands }`); brand vocabulary uses "part". Recommendation: `/parts/` for public routes, for institutional consistency and SEO, with redirects from existing routes if migrated. Internal table naming can stay `models` — the decision concerns public-facing routes and, optionally, API payload keys. To be settled before the part page ships and before the search-flow frontend issues freeze user-facing labels.
2. **Brand logos on navigation pages.** Nominative use of a brand name to indicate compatibility: defensible. Displaying logos: a distinct risk. Text only by default until the question is properly examined.
3. **Legality of automated extraction per platform (P3).** Verify the ToS of Printables and Thingiverse regarding automated metadata retrieval, even for an internal tool. Alternative: assisted entry without scraping (the curator copy-pastes, the tool structures).
4. **Multi-file archive.** Generated on the fly or pre-generated at curation time. Technical decision, left to Agent Dev with a Vercel cost constraint.

---

## 6. Explicitly deferred flows

| Flow | Reason for deferral | Reassessment |
|---|---|---|
| Public publishing (contributor upload) | The seeding strategy is curation. A publish flow with no content base creates development with no users, a moderation burden, and an IP risk that cannot be absorbed solo. The Terms of Use already cover the legal framework for when the time comes. Note: contributors will never create product records, per the search-flow batch invariant. | When the index demonstrates its structure (order of magnitude: 100+ parts) and an identified community asks to contribute. |
| Public user accounts, collections, likes | No Phase 0 value on the visitor side. Likes verge on gamification, contrary to brand guidelines. | Together with the public publishing flow (accounts become necessary). |
| CPSP print flow | Sequencing already decided: build first, publish after. The CPSP software PoC is a separate workstream, not a flow of the public app. | Per CPSP Phase 0 roadmap. |
| Brand onboarding portal | Phase 2. No brand in discussion. | First formalised brand interest. |
| Public Index API | Announced as "Upcoming" on the institutional site, but it exposes what the search-flow batch and P1/P2 structure. Building it before the public flows would invert the order. | After schema stabilisation through the search-flow batch and P1–P3. |

---

## 7. Recommended development order

Cross-batch dependencies now drive the order:

0. **Product compatibility schema** (search-flow batch, `agent:pm`) — validated and executed by the human before anything below starts. It establishes direct part-to-product links and `compatibility_status`, which block P1's compatibility block, the curation entity layer, and P2.
1. **P1** (part page + download + reporting) — unlocks the value of the search flow.
2. **P3** (curation entity layer, then the curation tool) — in parallel with P1 if possible: every week without the tool costs hours of manual curation, and the entity layer plus dedup audit gate P2.
3. **P2** (`/browse` hub + brand/category pages) — after the entity dedup audit, and coordinated with the product page redesign issue (search-flow batch) so breadcrumbs land on existing pages.

Each flow is broken down into GitHub issues following the existing process (Agent PM → labels → Agent Dev). The corresponding issue batch is maintained in `create-user-flow-issues-v2.sh`.

---

*Common Parts — Working document — July 2026*
