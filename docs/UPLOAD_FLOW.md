# Public Upload Flow

## Overview

The upload flow is the **public** contribution path: a contributor publishes a part **they designed themselves**, and the registry **hosts the files** (issue #293).

That is the whole scope. Of the three ways a part enters the registry, the two that reference someone else's publication — link-out with files hosted here, and link-out with the files left at the source — belong to the [internal curation tool](CURATION_TOOL.md). The upload flow has no origin selector, no hosting selector, no source-attribution fields and no verification-status control, and its endpoints **reject** a payload that tries to set any of them.

**Route:** `/publish` (under the `(dashboard)` route group), shared with the elsewhere track — see [PUBLISH_FLOW.md](PUBLISH_FLOW.md). Protected by `lib/supabase/middleware.ts` (`/publish` is in `PROTECTED_ROUTE_PREFIXES`); unauthenticated visitors are redirected to `/login?redirect=/publish`. Any authenticated user may publish. The former `/upload` route is removed, not redirected.

It shares its UX with the curation tool — persistent drafts, a step per concern, a review screen rendering the real part page, and a server-enforced publish gate — because the two flows have the same failure mode: a long form that loses everything when a session breaks.

## Session flow

A session is the shared 5-step stepper rendered by `components/publish/original-track.tsx`, over the shared step components in `components/publish/`. Every step transition **persists to the draft**, so an interrupted session is never lost.

| # | Step | Purpose |
|---|------|---------|
| 1 | **Origin** | Title, category, publication license, and the originality declaration. Creates the draft. |
| 2 | **Files** | Model files (STL/3MF/STEP) and photos, uploaded through the three-phase client pipeline. |
| 3 | **Details** | Short description, instructions, tags, and print metadata. |
| 4 | **Compatibility** | Brand and compatible products, with product creation available inline. |
| 5 | **Review** | Renders the real part page against the draft; publish or save as draft. |

### 1. Origin

The creation minimum: a title, a category, a hostable license, and the declaration. A draft cannot exist without all four.

The license list is filtered to the **hosting whitelist** — commercial use *and* redistribution allowed, and not a NoDerivatives variant — via the shared `isHostableLicense` in `lib/utils/licenses.ts`. Unlike curation, there is **no link-out escape hatch**: this flow only hosts, so an NC/ND part simply cannot be published through it. The shared form hook preselects the first license it loads, which is not necessarily hostable; the tool clears an unhostable preselection so the choice is always explicit.

#### Originality declaration

The contributor's counterpart of the curator's blocking checklist, and the **only blocking check** in this flow. It is one statement covering three clauses (`ATTESTATION_CLAUSES` in `lib/upload/attestation.ts`): the part is their own design, they hold the right to publish it under the selected license, and the files are published here rather than linked from elsewhere.

It is presented as a single checkbox over an itemized list, not three checkboxes — this is one declaration, and splitting it would invite confirming two thirds of a legal claim.

It is recorded on the row at **creation**, not at publish: a draft in this flow only exists because someone claimed authorship, and pinning `originality_attested_at` there dates the claim to when it was actually made. On resume the checkbox is disabled and the tool notes when the declaration was recorded.

### 2. Files

Model files and photos go through the existing three-phase client-upload pipeline (`lib/storage/client-upload.ts` → `POST /api/models/[slug]/files`), which keeps file bytes out of the serverless body-size limit. Files are registered as soon as they upload, so leaving the session does not lose them.

The upload button stays disabled until the session is ready — the storage path needs the owner id, which arrives from an async auth call, and without the guard there is a window where a click silently does nothing.

Registered images are shown as a thumbnail grid in canonical order, the first tagged as the thumbnail — the same treatment as curation, so it is obvious the gallery is in place rather than an opaque count.

### 3. Details

Short description, instructions, tags, and print metadata (material, colour, dimensions, print settings, print-time and material-usage estimates). Serialized by the shared `serializeModelMetadata` in `lib/utils/model-metadata.ts` — the same serializer curation uses — and parsed server-side by the shared `parseDimensions`/`parsePrintSettings`/`parseNonNegative*` helpers.

### 4. Compatibility

Brand autocomplete (read-only list — brands are curated directly in the DB) and product autocomplete scoped to the brand, reusing `components/ui/combobox.tsx` and `components/forms/create-product-modal.tsx`. Product creation is dedup-guarded (issue #253).

**A brand and at least one product are required to publish.** Flow P2 descends brand → product → part, so a part missing either is published and unfindable. Brand comes first in the UI and gates the product picker: products are scoped to the brand, and changing the brand clears the selection, so offering the picker earlier would only invite choices the next click throws away.

The gate additionally checks that every linked product **belongs to the selected brand**. The UI cannot produce a mismatch on its own — changing the brand clears the products — but a brand changed after the fact through the API could, and a part filed under one brand while fitting another's products sits at the wrong place in the browse tree.

The curator-facing demand panel is deliberately absent — open part-request counts steer curation priorities, and are not a contributor's concern.

### 5. Review & publish

The review screen renders the **actual part page** (`components/model/model-details.tsx`) against the draft; the model-details API serves the owner their own draft so the preview is faithful. **Publish** calls the gate below and, on success, redirects to `/parts/[slug]`. **Save as draft** exits to the drafts list.

## Publish gate

`POST /api/upload/drafts/[id]/publish` re-validates **everything server-side** — the client cannot bypass it. Publication is blocked (HTTP 422 with `blockers[]`) unless all hold:

1. A title.
2. A category.
3. The originality declaration is recorded.
4. A license is set and it is hostable (commercial + modification, no NC/ND).
5. At least one registered model file.
6. A brand is set.
7. At least one linked product, and every one of them belongs to that brand.

The review step also mirrors the file, brand and product conditions locally so a blocked publish can be explained before the round trip — the server stays the authority.

## Flow narrowing

`lib/upload/payload.ts` lists the request-body keys the upload endpoints refuse: `originType`, `fileHostingType`, `verificationStatus`, `sourceUrl`, `sourcePlatform`, `originalAuthor`, `originalAuthorUrl`, `sourceLicenseId` — each in both camelCase and snake_case. A payload carrying any of them is a **400**, checked before any database work.

Two decisions worth keeping explicit:

- **Rejected, not stripped.** Silently ignoring a field a caller deliberately sent hides the real answer ("this flow cannot do that") behind a record that quietly isn't what was asked for.
- **Presence, not value.** An explicit `fileHostingType: 'hosted'` is still refused: it is a caller driving a control this flow does not expose, and today's forced value is not a contract.

The narrowing is also expressed in the types — `UploadDraftPatch` has no key for any of these columns — so a route cannot set one even by mistake. `createUploadDraft` sets `origin_type = 'original'`, `file_hosting_type = 'hosted'` and `verification_status = 'unverified'` explicitly rather than relying on column defaults, because the premise of the flow is that these three are not the contributor's to choose.

Covered by `lib/upload/payload.test.ts`.

## Persistent drafts

- A draft is a `models` row with `origin_type = 'original'` and `status = 'draft'`.
- Created on the Part step; every later step transition sends a partial `PATCH /api/upload/drafts/[id]` (autosave). Only fields present in the payload are written — metadata fields must be strings when present, so a malformed payload returns 400 rather than silently clearing a column.
- The drafts list (`GET /api/upload/drafts`) shows the contributor's open drafts, most-recently-touched first, for **Resume**. A resumed session hydrates all form state, metadata and registered images from `GET /api/upload/drafts/[id]`, then opens at the first step holding an unmet publish blocker (`lib/publish/blockers.ts`), falling back to Review.
- **Delete.** Each draft has a bin action (confirmation-gated) that reuses the owner-scoped `DELETE /api/models/[slug]` — it removes the row and cleans up storage.

Every upload query is scoped `origin_type = 'original'`, mirroring the `'curated'` scoping in `queries/curation.ts`. That single filter is what keeps the flows apart: **upload endpoints cannot mutate a curation draft, and curation endpoints cannot mutate an upload draft**, in either direction and regardless of who owns the row.

## API endpoints

All require an authenticated session (401 otherwise). Files live under `app/api/upload/`.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/upload/drafts` | GET | List the caller's open upload drafts (resume). |
| `/api/upload/drafts` | POST | Create a draft (title + category + hostable license + declaration). |
| `/api/upload/drafts/[id]` | GET | Full draft state for resume (owner only; `user_id` stripped from the response). |
| `/api/upload/drafts/[id]` | PATCH | Partial autosave of any subset of editable fields. |
| `/api/upload/drafts/[id]/publish` | POST | Publication gate; 422 with `blockers[]` on failure. |

File registration reuses `POST /api/models/[slug]/files`; deletion reuses `DELETE /api/models/[slug]`. Neither is upload-specific.

`POST /api/models/upload` — the single-shot endpoint of the old form — is **removed**. It accepted origin type, hosting type and verification status from the client, which is exactly what this flow exists to prevent, and leaving it would have kept a second, unguarded way in. (`/api/models/upload` now falls through to the `[slug]` route, which does not handle POST.)

## Data model

Migration `supabase/migrations/20260731134450_upload_originality_attestation.sql` (applied to production 2026-07-31).

> The filename timestamp is the version `schema_migrations` recorded, not the one the file was drafted under — `apply_migration` stamps its own. If the two ever diverge, `supabase db push` reads the file as un-applied and runs it again.

**On `models`:**

| Column | Type | Notes |
|--------|------|-------|
| `originality_attested` | boolean, not null, default false | The declaration was made. **Blocking** condition of the publish gate. |
| `originality_attested_at` | timestamptz | When it was made. |

A DB CHECK ties the pair in **both** directions — `originality_attested = (originality_attested_at is not null)` — so neither a flag without a timestamp nor a timestamp without a flag can be stored. The second direction matters as much as the first: a timestamp alone would date a declaration nobody made.

Plus `idx_models_owner_origin_status` on `(user_id, origin_type, status, updated_at desc)` — the drafts-list access path, shared with the curation drafts list.

Everything else reuses columns that already existed on `models`.

The attestation deliberately does **not** reuse `curation_checklist`: that column records a curator's judgement of someone else's part. Conflating it with a contributor's declaration about their own work would make neither auditable.

Rows that predate this flow carry `originality_attested = false`, and are not backfilled — a declaration nobody made should not be recorded as if it had been. Nothing is lost by that: at the time the migration ran every existing part was `origin_type = 'curated'`, so no original upload was left unattested. The flag gates publishing from draft, so already-published parts are unaffected either way.

## What it deliberately does not do

- No link-out. A part whose files live on another platform is curated, not uploaded.
- No source attribution. The uploader is the author; there is no other author to credit.
- No self-declared verification status. New parts are `unverified`; verification is granted by the registry, not claimed by the uploader.
- No `manufacturer` origin. Brand-official uploads need a way to verify a brand identity, which does not exist yet.
- No editing of an already-published part (`PUT /api/models/[slug]` is still unimplemented).
- No contributor-facing brand creation; brands stay DB-curated.

## References

- `docs/CURATION_TOOL.md` — the flow for parts published elsewhere
- `docs/user-flows.md` — Flow P2 (why a linked product is required), Flow P3
- Issues #293 (this flow), #253 (entity dedup), #254 (curation tool)
