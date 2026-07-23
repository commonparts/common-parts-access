# Internal Curation Tool

## Overview

The curation tool is an internal, dashboard-only interface for turning an external part (Printables, Thingiverse, GitHub, …) into a published registry record in a single guided session (issue #254, Flow P3 in `docs/user-flows.md`). It replaces the manual markdown-checklist process, targeting ~10–15 minutes per part instead of ~45.

It is a **judged, unitary** flow — one part at a time, no bulk import, no auto-publish. Publication is gated by a server-enforced blocking checklist: a part failing any criterion cannot go live regardless of client state.

**Route:** `/curation` (under the `(dashboard)` route group). Protected by `lib/supabase/middleware.ts` (`/curation` is in `PROTECTED_ROUTE_PREFIXES`); unauthenticated visitors are redirected to `/login?redirect=/curation`. In Phase 0 there is no separate curator role — any authenticated user may curate (decision 2026-07-17).

> **Scope note.** The product-family concept referenced in the original issue was cancelled before implementation (the `flatten_products` migration removed `parent_id`/`product_kind`/`compatibility_status`). Entity assignment is **brand + flat product** only; there is no family selection and no per-product compatibility status.

## Session flow

A session is a 5-step stepper rendered by `components/curation/curation-tool.tsx`. Every step transition **persists to the draft** (see [Persistent drafts](#persistent-drafts)), so an interrupted session is never lost.

| # | Step | Purpose |
|---|------|---------|
| 1 | **Source** | Source URL + duplicate check + best-effort pre-fill, title, platform, author, declared source license, and the hosting choice. Creates the draft (and kicks off the source-image import). |
| 2 | **Checklist** | The six blocking criteria + the optional legal-review flag. Also the rejection recorder. |
| 3 | **Details** | Short description, instructions, category, publication license, entity assignment (brand/product) with demand context, and print metadata. |
| 4 | **Flags & files** | Non-blocking completeness flags and file upload (hosted parts). |
| 5 | **Review** | Renders the real part page against the draft; publish or save as draft. |

### 1. Source

- **Duplicate check.** As the curator types the source URL, a debounced `GET /api/curation/source-check` looks it up against the `idx_models_source_url` unique index. A hit blocks the step and links to the existing part.
- **Pre-fill.** The same debounce also calls `GET /api/curation/prefill` — see [Pre-fill from the source URL](#pre-fill-from-the-source-url). Every field stays editable and manual entry always works.
- **Hosting choice** (`hosted` vs `link_out`) — see [File hosting](#file-hosting-hosted-vs-link-out). A declared NC/ND source license forces `link_out` (the hosted option is disabled).
- Creating the draft requires the DB minimum for `origin_type = 'curated'`: title, source URL, original author, and source license.

#### Pre-fill from the source URL

Pasting a source URL pre-fills what can be extracted, so curation starts from a filled form instead of a blank one (Flow P3 §4.3 step 2). Pre-fill is **best-effort and never blocks**: any failure falls back silently to manual entry, and every pre-filled field is marked with a "Pre-filled" badge that clears the moment the curator edits it (values are only ever written to empty fields, never over manual input).

- **Platform detection** works for every seeded platform: the URL host is matched (www-insensitive) against `source_platforms.base_url`.
- **Author, declared license and content** are extracted **for Printables only** in this phase, via the platform's public GraphQL API (`api.printables.com`), server-side:
  - **Source step:** original author, author URL (`printables.com/@handle`), and the declared license (Printables' license abbreviation → SPDX id → the `licenses` row). Selecting/pre-filling the source license also pre-selects it as the **publication** license (still editable on Details).
  - **Details step:** short description (Printables `summary`), instructions (their rich-HTML `description`, converted to plain text), material, layer height (only when every listed gcode agrees on one value), and print-time / material-usage estimates. Infill, supports, colour and dimensions are not exposed by the API and stay manual.
- **Images** are imported separately — see [Source-image import](#source-image-import).

Extraction runs **server-side only** and is not exposed publicly. Thingiverse and other platforms deliberately have **no extractor yet** (automated retrieval is pending the ToS decision tracked in the issue); they still get platform detection. Implemented via `lib/curation/prefill.ts` (orchestration + Printables fetch), `lib/curation/prefill-parsing.ts` (pure, unit-tested parsing/mapping), and `lib/curation/printables-api.ts` (the shared GraphQL client).

### 2. Blocking checklist

The six criteria of **curation checklist v1**, defined once in `lib/curation/checklist.ts` (`CURATION_BLOCKING_CRITERIA`) and shared by the UI and the publish gate so they can never drift:

| Key | Label | Meaning |
|-----|-------|---------|
| `eligibility` | Eligible part | Functional spare part for a real product — in scope, not decorative/generic. |
| `product_target` | Product target identified | Targets an identifiable product; the product record is linked this session. |
| `license` | License verified | SPDX license identified. Hosting requires the whitelist (no NC/ND); NC/ND parts must link out. |
| `file` | Valid file | STL/3MF/STEP present (uploaded, or verified at the source for link-out) and opens correctly. |
| `attribution` | Attribution complete | Original author, source URL and source license captured. |
| `duplicate` | No duplicate | Source and part are not already in the registry. |

Every criterion must be explicitly checked to publish. Checklist state is stored as `models.curation_checklist` (jsonb `{criterion: boolean}`).

**Legal-review flag.** `needs_legal_review` is a manual escalation (ambiguous/suspicious license). It is **blocking** — the part is saved but never publishable while set — and requires a justification (enforced both in the API and by a DB CHECK constraint).

**Rejection.** If a blocking criterion can't be met, the curator records a rejection via `POST /api/curation/rejections`: a reason plus the auto-traced failed criteria, written to `curation_rejections` independently of any model row (rejection traceability, Flow P3 §4.3.3).

### 3. Details & entity assignment

- **Text fields:** short description, instructions, category (drill-down), publication license. The publication-license select defaults to the declared source license and stays editable.
- **Entity assignment:** brand autocomplete (read-only list — brands are curated directly in the DB, not created here) and product autocomplete scoped to the brand, reusing `components/ui/combobox.tsx` and `components/forms/create-product-modal.tsx`. Product creation is dedup-guarded (issue #253).
- **Demand context:** `components/curation/demand-panel.tsx` shows open `part_requests` counts per selected product via `GET /api/curation/demand` (the aggregate-only `fetch_part_request_counts` RPC — never row-level data). Read-only; steers curation by captured demand (Flow P3 §4.3.5).
- **Print metadata:** material, color, dimensions (L/W/H + unit), print settings (layer height, infill, supports), and print-time/material-usage estimates. Applies to hosted and link-out parts alike. Serialized by the shared `serializeModelMetadata` in `lib/utils/model-metadata.ts` (same serializer the public upload flow uses) and parsed server-side by the shared `parseDimensions`/`parsePrintSettings`/`parseNonNegative*` helpers.

### 4. Non-blocking flags & files

- **Completeness flags** (`components/curation/flags-panel.tsx`), defined in `CURATION_FLAGS`: `needs_verification`, `needs_print_settings`, `needs_photo`, `needs_instructions`, `needs_category`. Each is a **positive confirmation** in the UI; leaving it unchecked sets the matching `needs_*` column. None block publication. A fresh curated draft initializes all five to `true` (nothing confirmed yet).
- **Files:** hosted parts upload STL/3MF/STEP model files and photos through the existing three-phase client-upload pipeline (`lib/storage/client-upload.ts` → `POST /api/models/[slug]/files`), which bypasses the Vercel body-size limit. Link-out parts upload no model files (they stay at the source); photos are still allowed.
- **Image previews.** Registered images (imported or uploaded) are shown as a thumbnail grid in canonical order, the first tagged as the thumbnail — so it is obvious the gallery is in place rather than an opaque count. Both `POST /api/models/[slug]/files` and the import endpoint return the model's `images` list so the grid updates without a refetch.

#### Source-image import

Right after the draft is created (Printables sources only), the tool fires `POST /api/curation/drafts/[id]/import-images` in the background. It downloads the source gallery server-side and registers each image under a numbered filename (`00-…`, `01-…`, in page order). The canonical filename sort (`sortImageUrls`) then makes `00` the thumbnail and keeps the slideshow in source order — no display-side change needed. It is **best-effort and idempotent**: unreachable, oversized (> 8 MB) or non-image entries are skipped with gapless numbering, the batch is capped at the existing 10-image limit, and a draft that already has images is left untouched. A failed import is silent; the curator uploads photos manually. Implemented via `lib/curation/source-images.ts`; thumbnail selection is the shared `mergeImageUrls` in `lib/utils/images.ts`.

### 5. Review & publish

- The review screen renders the **actual part page** (`components/model/model-details.tsx`) against the draft. The model-details API serves the owner their own draft so the preview is faithful.
- **Publish** calls `POST /api/curation/drafts/[id]/publish`, the single publication gate (see below). On success the part flips to `published` and the curator is redirected to `/parts/[slug]`. On failure it returns **422** with a list of named blockers.
- **Save as draft** exits without publishing; the draft appears in the drafts list for resume.

## File hosting: hosted vs link-out

The no-NC/ND rule is a **hosting** rule, not a curation rule (issue #254 follow-up).

- **`hosted`** — files are stored in the registry. Requires a whitelist license: allows commercial use *and* redistribution *and* is not a NoDerivatives (ND) variant. At least one registered model file is required to publish.
- **`link_out`** — files stay on the source platform. **NC/ND licenses are allowed.** Requires a source platform whose domain matches the source URL; publishing is blocked if any model file is registered (a link-out part must never host files).

The "hostable license" test is the shared `isHostableLicense` in `lib/utils/licenses.ts`. The flag pair alone is not enough — `CC-BY-ND` allows commercial use and redistribution of the unmodified work — so ND is excluded by SPDX id.

A declared **NC/ND source license forces `link_out`**: the tool auto-switches hosting and disables the hosted option (the files cannot be hosted here under those terms). The hosting selector otherwise gates the publication-license list (link-out unlocks NC/ND) and lives on the Source step, reachable from the Checklist step via Back. Switching back to `hosted` clears a now-invalid NC/ND selection.

## Publish gate

`POST /api/curation/drafts/[id]/publish` re-validates **everything server-side** — the client cannot bypass it. Publication is blocked (HTTP 422 with `blockers[]`) unless all hold:

1. All six checklist criteria explicitly checked.
2. `needs_legal_review` is not set.
3. A publication license is set, and — for **hosted** parts only — both it and the declared source license are hostable (commercial + redistribution, no ND).
4. **Hosted:** ≥ 1 registered model file. **Link-out:** a source platform is set, and **no** model files are registered.
5. ≥ 1 linked product (`product_target` made concrete).

## Persistent drafts

- A draft is a `models` row with `origin_type = 'curated'` and `status = 'draft'`.
- Created on the Source step; every later step transition sends a partial `PATCH /api/curation/drafts/[id]` (autosave). Only the fields present in the payload are written — metadata fields must be strings when present, so a malformed payload returns 400 rather than silently clearing a column.
- The drafts list (`GET /api/curation/drafts`) shows the curator's open curated drafts, most-recently-touched first, for **Resume**. A resumed session hydrates all form state, checklist, flags, hosting type, metadata and registered images from `GET /api/curation/drafts/[id]`, then opens at the Checklist step.
- **Delete.** Each draft has a bin action (confirmation-gated) that reuses the owner-scoped `DELETE /api/models/[slug]` — it removes the row and cleans up storage, and frees the source URL for a new session (issue #288).

## API endpoints

All require an authenticated session (401 otherwise). Files live under `app/api/curation/`.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/curation/source-check?url=` | GET | Duplicate check on `source_url`; returns the existing part or `null`. |
| `/api/curation/prefill?url=` | GET | Best-effort pre-fill (platform, author, license, print metadata, texts); null fields on any failure, never an error. |
| `/api/curation/drafts` | GET | List the caller's open curated drafts (resume). |
| `/api/curation/drafts` | POST | Create a draft (title + source URL + author + source license; hosting type). 409 on duplicate source URL; 400 if a hosted draft carries an NC/ND source license. |
| `/api/curation/drafts/[id]` | GET | Full draft state for resume (owner only; `user_id` stripped from the response). |
| `/api/curation/drafts/[id]` | PATCH | Partial autosave of any subset of editable fields. |
| `/api/curation/drafts/[id]/publish` | POST | Publication gate; 422 with `blockers[]` on failure. |
| `/api/curation/drafts/[id]/import-images` | POST | Import the source gallery into the draft (Printables); best-effort, idempotent. |
| `/api/curation/rejections` | POST | Record a rejection (source URL, reason, failed criteria). |
| `/api/curation/demand?productId=` | GET | Aggregate open part-request counts for a product. |

Draft deletion reuses `DELETE /api/models/[slug]` (not curation-specific).

## Data model

Migration `supabase/migrations/20260717120000_curation_tool_fields.sql` (applied to production 2026-07-18).

**On `models`:**

| Column | Type | Notes |
|--------|------|-------|
| `needs_verification` | boolean, default false | Non-blocking completeness flag. |
| `needs_print_settings` | boolean, default false | Non-blocking. |
| `needs_photo` | boolean, default false | Non-blocking. |
| `needs_instructions` | boolean, default false | Non-blocking. |
| `needs_category` | boolean, default false | Non-blocking. |
| `needs_legal_review` | boolean, default false | **Blocking.** Requires `legal_review_justification` (DB CHECK). |
| `legal_review_justification` | text | ≤ 1000 chars (DB CHECK). |
| `curation_checklist` | jsonb, default `{}` | The six blocking criteria as `{criterion: boolean}`. |

Print metadata (`material`, `color`, `dimensions`, `print_settings`, `estimated_print_time`, `estimated_material_usage`) reuses columns that already existed on `models`.

**Table `curation_rejections`** — rejection traceability, independent of any model row:

| Column | Type |
|--------|------|
| `id` | uuid PK |
| `source_url` | text (≤ 2048) |
| `reason` | text (1–1000 chars) |
| `failed_criteria` | text[] |
| `created_by` | uuid → `user_profiles(id)` |
| `created_at` | timestamptz |

RLS: authenticated users may insert (with `created_by = auth.uid()`) and read.

## Key files

```
app/(dashboard)/curation/page.tsx          Drafts list + session launcher
components/curation/
  curation-tool.tsx                         The 5-step stepper orchestrator
  blocking-checklist.tsx                    Checklist v1 + legal-review flag
  flags-panel.tsx                           Non-blocking completeness flags
  demand-panel.tsx                          Read-only part_requests demand context
lib/curation/
  checklist.ts                              Criteria + flags definitions (single source of truth)
  prefill.ts                                Source-URL pre-fill orchestration (Printables extractor)
  prefill-parsing.ts                        Pure, unit-tested parsing/mapping for pre-fill
  printables-api.ts                         Shared public-GraphQL client (server-side only)
  source-images.ts                          Gallery listing + numbered-filename builder
lib/supabase/queries/curation.ts           Draft CRUD, rejections, source lookup
lib/supabase/queries/licenses.ts           License lookup by SPDX id / id (for pre-fill + gates)
lib/utils/model-metadata.ts                 Shared metadata parsers + serializer (also used by upload)
lib/utils/licenses.ts                       isHostableLicense (NC/ND exclusion), shared by tool + gates
lib/utils/images.ts                         sortImageUrls + mergeImageUrls (thumbnail selection)
app/api/curation/**                         Endpoints above (incl. prefill, drafts/[id]/import-images)
supabase/migrations/20260717120000_curation_tool_fields.sql
```

## What it deliberately does not do

- No bulk import; curation is unitary and judged.
- No auto-publish — the review screen is always in the path.
- No public exposure of the tool.
- No contributor-facing product/brand creation (brands are DB-curated; product creation is curator-only and dedup-guarded).
- No automated product matching — product assignment is a human judgement call.

## References

- `docs/user-flows.md` — Flow P3 (§4)
- Issues #254 (tool), #253 (entity dedup), #255 (source-URL pre-fill), #288 (draft deletion)
