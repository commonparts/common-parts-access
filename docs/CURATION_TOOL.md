# Internal Curation Tool

## Overview

The curation tool is an internal, dashboard-only interface for turning an external part (Printables, Thingiverse, GitHub, …) into a published registry record in a single guided session (issue #254, Flow P3 in `docs/user-flows.md`). It replaces the manual markdown-checklist process, targeting ~10–15 minutes per part instead of ~45.

It is a **judged, unitary** flow — one part at a time, no bulk import, no auto-publish. Publication is gated by a server-enforced blocking checklist: a part failing any criterion cannot go live regardless of client state.

> **Curation vs. upload.** Curation covers parts that *reference a publication made elsewhere*: the files stay at the original publication and Common Parts links to them (#396). A contributor publishing **their own design** uses the public [upload flow](UPLOAD_FLOW.md) instead. The two are kept apart at the query level — every curation query is scoped to `origin_type = 'curated'`, every upload query to `'original'` — so neither flow can touch the other's drafts.

**Route:** `/publish` (under the `(dashboard)` route group), shared with the original track — see [PUBLISH_FLOW.md](PUBLISH_FLOW.md). Protected by `lib/supabase/middleware.ts` (`/publish` is in `PROTECTED_ROUTE_PREFIXES`); unauthenticated visitors are redirected to `/login?redirect=/publish`. There is no curator role — any authenticated user may publish on either track (decision 2026-07-17). The former `/curation` route is removed, not redirected.

> **Scope note.** The product-family concept referenced in the original issue was cancelled before implementation (the `flatten_products` migration removed `parent_id`/`product_kind`/`compatibility_status`). Entity assignment is **brand + flat product** only; there is no family selection and no per-product compatibility status.

## Session flow

A session is the shared 5-step stepper rendered by `components/publish/elsewhere-track.tsx`, over the shared step components in `components/publish/`. Every step transition **persists to the draft** (see [Persistent drafts](#persistent-drafts)), so an interrupted session is never lost.

| # | Step | Purpose |
|---|------|---------|
| 1 | **Origin** | Source URL + duplicate check + best-effort pre-fill, title, category, platform, author, the license at the source, and the statement that the part is referenced at its source. Creates the draft (and kicks off the source-image import, which also runs when a draft without images is resumed). Carries the `duplicate`, `attribution`, `license` and `eligibility` criteria and the rejection recorder. |
| 2 | **Files** | Photos only — the model files stay at the source. Carries the `file` criterion. |
| 3 | **Details** | Short description, instructions, tags, and print metadata. |
| 4 | **Compatibility** | Brand and product assignment with demand context. Carries the `product_target` criterion. |
| 5 | **Review** | Renders the real part page against the draft; checklist roll-up, legal-review escalation, publish or save as draft. |

The dedicated Checklist and Flags steps were dissolved in issue #302: the criteria and completeness flags keep their definitions, storage and gate enforcement, and only their rendering location changed — see [PUBLISH_FLOW.md](PUBLISH_FLOW.md) and `lib/publish/placement.ts`.

### 1. Source

- **Duplicate check.** As the curator types the source URL, a debounced `GET /api/curation/source-check` looks it up against the `idx_parts_source_url` unique index. A hit blocks the step and links to the existing part.
- **Pre-fill.** The same debounce also calls `GET /api/curation/prefill` — see [Pre-fill from the source URL](#pre-fill-from-the-source-url). Every field stays editable and manual entry always works.
- **No hosting choice.** A part published elsewhere is always referenced (`link_out`) — see [File hosting](#file-hosting-always-link-out).
- **One license.** A part published elsewhere keeps the license its designer chose: Common Parts Access does not hold the rights and grants no other terms. The Origin step has a single field, "License at the source", stored in `parts.license_id` (#374). It starts empty: the curator records the license declared at the source, or accepts the pre-filled one.
- Creating the draft requires the DB minimum for `origin_type = 'curated'` — title, source URL, original author, and the license at the source — plus the source platform, which a referenced part needs.

#### Pre-fill from the source URL

Pasting a source URL pre-fills what can be extracted, so curation starts from a filled form instead of a blank one (Flow P3 §4.3 step 2). Pre-fill is **best-effort and never blocks**: any failure falls back silently to manual entry, and every pre-filled field is marked with a "Pre-filled" badge that clears the moment the curator edits it (values are only ever written to empty fields, never over manual input).

- **Platform detection** works for every seeded platform: the URL host is matched (www-insensitive) against `source_platforms.base_url`.
- **Author, declared license and content** are extracted **for Printables only** in this phase, via the platform's public GraphQL API (`api.printables.com`), server-side:
  - **Source step:** original author, author URL (`printables.com/@handle`), and the declared license (Printables' license abbreviation → SPDX id → the `licenses` row), written to the "License at the source" field.
  - **Details step:** short description (Printables `summary`), instructions (their rich-HTML `description`, converted to plain text), material, layer height (only when every listed gcode agrees on one value), and print-time / material-usage estimates. Infill, supports, colour and dimensions are not exposed by the API and stay manual.
- **Images** are imported separately — see [Source-image import](#source-image-import).

Extraction runs **server-side only** and is not exposed publicly. Thingiverse and other platforms deliberately have **no extractor yet** (automated retrieval is pending the ToS decision tracked in the issue); they still get platform detection. Implemented via `lib/curation/prefill.ts` (orchestration + Printables fetch), `lib/curation/prefill-parsing.ts` (pure, unit-tested parsing/mapping), and `lib/curation/printables-api.ts` (the shared GraphQL client).

### 2. Blocking checklist

The six criteria of **curation checklist v1**, defined once in `lib/curation/checklist.ts` (`CURATION_BLOCKING_CRITERIA`) and shared by the UI and the publish gate so they can never drift:

| Key | Label | Meaning |
|-----|-------|---------|
| `eligibility` | Eligible part | Functional spare part for a real product — in scope, not decorative/generic. |
| `product_target` | Product target identified | Targets an identifiable product; the product record is linked this session. |
| `license` | License verified | SPDX license identified, among the licenses of the `licenses` table. NC and ND are accepted because the files stay at the source; a license that forbids sharing the model is not. |
| `file` | Valid file | STL/3MF/STEP verified at the source and opens correctly. |
| `attribution` | Attribution complete | Original author, source URL and the license at the source captured. |
| `duplicate` | No duplicate | Source and part are not already in the registry. |

Every criterion must be explicitly checked to publish. Checklist state is stored as `parts.curation_checklist` (jsonb `{criterion: boolean}`).

**Legal-review flag.** `needs_legal_review` is a manual escalation (ambiguous/suspicious license). It is **blocking** — the part is saved but never publishable while set — and requires a justification (enforced both in the API and by a DB CHECK constraint).

**Rejection.** If a blocking criterion can't be met, the curator records a rejection via `POST /api/curation/rejections`: a reason plus the auto-traced failed criteria, written to `curation_rejections` independently of any part row (rejection traceability, Flow P3 §4.3.3).

### 3. Details & entity assignment

- **Text fields:** short description, instructions, category (drill-down). The license is recorded on the Origin step.
- **Entity assignment:** brand autocomplete (read-only list — brands are curated directly in the DB, not created here) and product autocomplete scoped to the brand, reusing `components/ui/combobox.tsx` and `components/forms/create-product-modal.tsx`. Product creation is dedup-guarded (issue #253).
- **Demand context:** `components/publish/demand-panel.tsx` shows open `part_requests` counts per selected product via `GET /api/curation/demand` (the aggregate-only `fetch_part_request_counts` RPC — never row-level data). Read-only; steers curation by captured demand (Flow P3 §4.3.5).
- **Print metadata:** material, color, dimensions (L/W/H + unit), print settings (layer height, infill, supports), and print-time/material-usage estimates. Serialized by the shared `serializePartMetadata` in `lib/utils/part-metadata.ts` (same serializer the public upload flow uses) and parsed server-side by the shared `parseDimensions`/`parsePrintSettings`/`parseNonNegative*` helpers.

### 4. Non-blocking flags & files

- **Completeness flags**, defined in `CURATION_FLAGS` and rendered inline beside their subject (`lib/publish/placement.ts`): `needs_verification`, `needs_print_settings`, `needs_photo`, `needs_instructions`, `needs_category`. Each is a **positive confirmation** in the UI; leaving it unchecked sets the matching `needs_*` column. None block publication. A fresh curated draft initializes all five to `true` (nothing confirmed yet).
- **Files:** a curated part uploads no model files (they stay at the source). Photos go through the three-phase client-upload pipeline (`lib/storage/client-upload.ts` → `POST /api/parts/[slug]/files`), which bypasses the Vercel body-size limit.
- **Image previews.** Registered images (imported or uploaded) are shown as a thumbnail grid in canonical order, the first tagged as the thumbnail — so it is obvious the gallery is in place rather than an opaque count. Both `POST /api/parts/[slug]/files` and the import endpoint return the part's `images` list so the grid updates without a refetch.

#### Source-image import

The tool fires `POST /api/curation/drafts/[id]/import-images` in the background (Printables sources only) at two points:

- **Draft creation** — right after the Origin step creates the draft.
- **Draft resume** — when a resumed draft has no registered image (`image_file_count = 0` and an empty `images` array). This covers drafts created outside the Origin step, which never went through the creation trigger, and drafts whose import failed at creation. A resumed draft that already has at least one image, or whose source platform is not supported, triggers nothing. The resume import fires once per resume (guarded against effect re-runs and React strict mode) and never blocks hydration.

In both cases the Files step shows the import in progress, then the resulting grid and thumbnail, without a page reload. While the import runs, the photo field accepts neither a click nor a drop and the upload button is disabled; both are re-enabled when the import ends, whether it succeeded or failed. The import rewrites the part's image list from the state it read before importing, so a photo uploaded concurrently would drop out of the list (#357). The platform condition is shared by both triggers in `lib/curation/image-import.ts`.

The endpoint downloads the source gallery server-side and registers each image under a numbered filename (`00-…`, `01-…`, in page order). The canonical filename sort (`sortImageUrls`) then makes `00` the thumbnail and keeps the slideshow in source order — no display-side change needed. It is **best-effort and idempotent**: unreachable, oversized (> 8 MB) or non-image entries are skipped (an image is any extension in `FILE_TYPES.IMAGE_FILES`, GIF included — #217) with gapless numbering, the batch is capped at the existing 10-image limit, and a draft that already has images is left untouched. A failed import is silent; the curator uploads photos manually. Implemented via `lib/curation/source-images.ts`; thumbnail selection is the shared `mergeImageUrls` in `lib/utils/images.ts`.

### 5. Review & publish

- The review screen renders the **actual part page** (`components/part/part-details.tsx`) against the draft. The part-details API serves the owner their own draft so the preview is faithful.
- **Publish** calls `POST /api/curation/drafts/[id]/publish`, the single publication gate (see below). On success the part flips to `published` and the curator is redirected to `/parts/[slug]`. On failure it returns **422** with a list of named blockers.
- **Save as draft** exits without publishing; the draft appears in the drafts list for resume.

## File hosting: always link-out

A part published elsewhere is always referenced (#396): `file_hosting_type = 'link_out'`, the files stay on the source platform, and Common Parts links to them. Hosting files is reserved for parts published here for the first time, through the [upload flow](UPLOAD_FLOW.md). The `file_hosting_type` column keeps its two values; the rule is enforced by the database (check `parts_curated_link_out`, #422) and by the curation routes, from `lib/curation/hosting.ts`:

- The tool offers no hosting choice and saves every draft as `link_out`.
- `POST /api/curation/drafts` creates the draft as `link_out` (the default when `fileHostingType` is omitted) and returns **400** when `fileHostingType` is `hosted`. `PATCH /api/curation/drafts/[id]` does the same, and sending `link_out` moves a draft saved as `hosted` before the rule to it.
- The publish gate blocks a curated draft that is not `link_out`.
- `POST /api/parts/[slug]/files` returns **400** when model files are registered for a curated part; photos are accepted.

Any license of the `licenses` table is accepted, NC and ND included, because the files are never redistributed from here. A referenced part requires a source platform whose domain matches the source URL, and publishing is blocked if any model file is registered.

## Publish gate

`POST /api/curation/drafts/[id]/publish` re-validates **everything server-side** — the client cannot bypass it. Publication is blocked (HTTP 422 with `blockers[]`) unless all hold:

1. All six checklist criteria explicitly checked.
2. `needs_legal_review` is not set.
3. `file_hosting_type` is `link_out` — a hosted curated draft cannot be published (#396).
4. The license at the source (`license_id`) is set and exists in the `licenses` table.
5. A source platform is set, and **no** model files are registered.
6. ≥ 1 linked product (`product_target` made concrete).

When every condition holds, the gate sets `status = 'published'` with the service role (`publishDraftPart` in `lib/supabase/queries/publish.ts`), scoped to the part, its owner and `status = 'draft'`; it answers **409** if the part is no longer a draft. The database refuses a status change made with the user's session (`parts_guard_owner_writes`, #422), so the gate is the only way to publish. `POST /api/parts/[slug]/files` never changes the status (#403).

## Persistent drafts

- A draft is a `parts` row with `origin_type = 'curated'` and `status = 'draft'`.
- Created on the Source step; every later step transition sends a partial `PATCH /api/curation/drafts/[id]` (autosave). Only the fields present in the payload are written — metadata fields must be strings when present, so a malformed payload returns 400 rather than silently clearing a column.
- The drafts list (`GET /api/curation/drafts`) shows the curator's open curated drafts, most-recently-touched first, for **Resume**. A resumed session hydrates all form state, checklist, flags, metadata and registered images from `GET /api/curation/drafts/[id]`, then opens at the first step holding an unmet publish blocker (`lib/publish/blockers.ts`), falling back to Review. A draft saved as `hosted` before #396 opens on Origin, whose save references it.
- **Delete.** Each draft has a bin action (confirmation-gated) that reuses the owner-scoped `DELETE /api/parts/[slug]` — it removes the row and cleans up storage, and frees the source URL for a new session (issue #288).

## API endpoints

All require an authenticated session (401 otherwise). Files live under `app/api/curation/`.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/curation/source-check?url=` | GET | Duplicate check on `source_url`; returns the existing part or `null`. |
| `/api/curation/prefill?url=` | GET | Best-effort pre-fill (platform, author, license, print metadata, texts); null fields on any failure, never an error. |
| `/api/curation/drafts` | GET | List the caller's open curated drafts (resume). |
| `/api/curation/drafts` | POST | Create a draft (title + source URL + author + `licenseId`, the license at the source + source platform), always `link_out`. 409 on duplicate source URL; 400 if `fileHostingType` is `hosted`. |
| `/api/curation/drafts/[id]` | GET | Full draft state for resume (owner only; `user_id` stripped from the response). |
| `/api/curation/drafts/[id]` | PATCH | Partial autosave of any subset of editable fields. 400 if `fileHostingType` is `hosted`, or if `licenseId` is sent empty: a curated part cannot be saved without a license. |
| `/api/curation/drafts/[id]/publish` | POST | Publication gate; 422 with `blockers[]` on failure. |
| `/api/curation/drafts/[id]/import-images` | POST | Import the source gallery into the draft (Printables); best-effort, idempotent. |
| `/api/curation/rejections` | POST | Record a rejection (source URL, reason, failed criteria). |
| `/api/curation/demand?productId=` | GET | Aggregate open part-request counts for a product. |

Draft deletion reuses `DELETE /api/parts/[slug]` (not curation-specific).

## Data model

Migration `supabase/migrations/20260717120000_curation_tool_fields.sql` (applied to production 2026-07-18).

**On `parts`:**

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

Print metadata (`material`, `color`, `dimensions`, `print_settings`, `estimated_print_time`, `estimated_material_usage`) reuses columns that already existed on `parts`.

**Table `curation_rejections`** — rejection traceability, independent of any part row:

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
components/publish/
  elsewhere-track.tsx                       The 5-step stepper orchestrator
  legal-review-escalation.tsx               Legal-review flag + justification
  checklist-rollup.tsx                      Review roll-up of the six criteria
  judgement-checkbox.tsx                    One criterion or flag, rendered inline
  rejection-recorder.tsx                    Rejection traceability entry point
  demand-panel.tsx                          Read-only part_requests demand context
  files-step.tsx, details-step.tsx,         Steps shared with the original track
  compatibility-step.tsx, review-step.tsx
lib/publish/
  steps.ts                                  Step labels, indices, resume rule
  placement.ts                               Which step renders which judgement
  blockers.ts                               Local mirrors of both publish gates
lib/curation/
  checklist.ts                              Criteria + flags definitions (single source of truth)
  prefill.ts                                Source-URL pre-fill orchestration (Printables extractor)
  prefill-parsing.ts                        Pure, unit-tested parsing/mapping for pre-fill
  printables-api.ts                         Shared public-GraphQL client (server-side only)
  source-images.ts                          Gallery listing + numbered-filename builder
lib/supabase/queries/curation.ts           Draft CRUD, rejections, source lookup
lib/supabase/queries/publish.ts            draft -> published transition of both gates (service role)
lib/supabase/queries/licenses.ts           License lookup by SPDX id / id (for pre-fill + gates)
lib/utils/part-metadata.ts                 Shared metadata parsers + serializer (also used by upload)
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
