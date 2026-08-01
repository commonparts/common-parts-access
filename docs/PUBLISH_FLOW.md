# Unified Publish Flow

> **Status: implemented.** Issues #301 (vocabulary), #302 (step harmonization), #303 (unified entry). The engine documents [UPLOAD_FLOW.md](UPLOAD_FLOW.md) and [CURATION_TOOL.md](CURATION_TOOL.md) remain authoritative for everything server-side; this document owns the entry point, the vocabulary and the step structure shared by both.

## Overview

The upload flow and the curation tool are one public publication path behind one entry point: **Publish a part**. One orientation question routes the contributor onto one of two tracks that share the same five-step structure, the same components, and the same UX conventions.

What merged is the **entry, the vocabulary, and the step structure**. What did not merge is the **engines**: the `/api/upload/**` and `/api/curation/**` endpoint families, their publish gates, their payload narrowing, and the `origin_type` query scoping all remain exactly as documented. This is a frontend unification over two unchanged backends.

The reason for keeping the engines apart is inherited from `UPLOAD_FLOW.md` (Flow narrowing): a single endpoint accepting both shapes is the removed `POST /api/models/upload` reintroduced. The scoping (`origin_type = 'original'` vs `'curated'` on every query) is the integrity property that makes cross-track mutation impossible; it is load-bearing and stays.

**Access.** Any authenticated user may publish on either track. The curation tool's "internal" framing was a test-phase convention, never a technical restriction (decision 2026-07-17: no curator role; `curation_rejections` RLS already grants insert/read to all authenticated users).

## Vocabulary

Database values, column names, API routes and code paths **do not change**. Only user-facing copy does. The words *curation*, *curated*, *link-out* and *hosting type* never appear in the UI. The mapping lives in `lib/utils/publication.ts` (`describePublication`), so the part page, the tools and the drafts list cannot describe the same record differently.

| Storage (unchanged) | UI term | Part-page badge |
|---|---|---|
| `origin_type = 'original'` | "I designed this part" | **Original** |
| `origin_type = 'curated'`, `file_hosting_type = 'hosted'` | "Published elsewhere — files hosted on Common Parts" | **Hosted** |
| `origin_type = 'curated'`, `file_hosting_type = 'link_out'` | "Published elsewhere — files at the source" | **Referenced** |

Track names in copy: the **original track** and the **elsewhere track** ("published elsewhere"). *Referenced* is reserved for the hosting outcome, never used as the track name — one word for both would recreate the ambiguity this rename removes. For the same reason the part-page author card reads **"Added by"** on the elsewhere track, not "Referenced by" (see #299): the account shown brought the part in, and on a `hosted` part nothing is referenced.

## Entry and orientation

- **Route:** `/publish`, under the `(dashboard)` route group, in `PROTECTED_ROUTE_PREFIXES`.
- **`/upload` and `/curation` are removed, not redirected.** No permanent redirect was introduced — one that is never removed becomes a second route to the same feature and a source of drift. Inbound links we do not control 404; every link we do control was corrected in #303.
- The **Publish a part** button (hero, navbar, mobile menu, footer, profile menu) targets `/publish`.
- The landing state shows the contributor's open drafts — merged from `GET /api/upload/drafts` and `GET /api/curation/drafts` client-side (`lib/publish/drafts.ts`), most-recently-touched first, each row badged with its track — plus the orientation question.

**Orientation question** (`lib/publish/tracks.ts`) — the only conscious branching decision in the flow:

> **Where does this part come from?**
> - **I designed it** — I'm publishing it here for the first time. → original track
> - **It's already published elsewhere** — Printables, Thingiverse, GitHub, or another platform. → elsewhere track

Authorship alone does not decide the track: a designer whose files live on their own GitHub answers "already published elsewhere" and becomes `origin_type = 'curated'` with themselves as `original_author`. This phrases the existing rule as a verifiable fact rather than a legal self-assessment.

**The track is fixed at draft creation.** `origin_type` is immutable on a draft; switching tracks means deleting the draft and starting over (the existing bin action). The UI states this next to the question.

## Step structure

Both tracks render the same five-step stepper (`lib/publish/steps.ts`), same names, same order. Every step transition autosaves via the track's own `PATCH` endpoint.

| # | Step | Original track | Elsewhere track |
|---|------|----------------|-----------------|
| 1 | **Origin** | Title, category, publication license (hostable whitelist), originality declaration. Creates the draft. | Source URL (duplicate check + pre-fill), title, category, platform, author, author URL, source license, hosting outcome. Creates the draft; kicks off source-image import. Rejection recorder available. |
| 2 | **Files** | Model files + photos, three-phase pipeline. | Same for hosted. Referenced: photos only, with the model-file drop zone hidden entirely. |
| 3 | **Details** | Short description, instructions, tags, print metadata. | Same, plus the publication license (defaults to the declared source license). |
| 4 | **Compatibility** | Brand + products, inline product creation, dedup-guarded. | Same, plus the demand panel. |
| 5 | **Review** | Real part page rendered against the draft; publish or save as draft. | Same, plus the checklist roll-up, `needs_legal_review`, and the rejection recorder. |

Shared step components live in `components/publish/`; each track keeps its own orchestrator (`original-track.tsx`, `elsewhere-track.tsx`) because the endpoints, creation minimums and publish calls differ.

### Hosting is a displayed consequence, not a selector

The declared source license decides where the files end up, and the tool states the outcome:

| Declared source license | Displayed outcome | Contributor action available |
|---|---|---|
| Hostable (per `isHostableLicense`) | "The files will be hosted on Common Parts." (`hosted`) | Override: "Reference it at the source instead" — one click. Sets `link_out`. |
| NC / ND | "This license does not permit redistribution — Common Parts will link to the source." (`link_out`) | None. Hosting is not offered. |

The override carries the existing link-out constraints: the source platform must match the source URL's domain, and publishing is blocked if any model file is registered. Rather than duplicating domain matching client-side, the override button is disabled with the reason shown in both cases; the server remains the check. Switching back to hosted clears a now-invalid NC/ND publication-license selection.

The override deliberately has **no free-text reason field**: no column stores one, `curation_rejections` is for rejected sources rather than published parts, and a field that discards what you type is worse than no field (decision 2026-08-01).

## Checklist dissolution

The dedicated Checklist step is gone **as a step**. The six blocking criteria are unchanged in definition (`CURATION_BLOCKING_CRITERIA`), storage (`models.curation_checklist` jsonb), and gate enforcement. Only *where each checkbox renders* changed — adjacent to the evidence it judges. The mapping is `lib/publish/placement.ts`:

| Criterion | Rendered on | Adjacent to |
|---|---|---|
| `duplicate` | Step 1 | The source-URL field (a passing source-check is noted as a hint, but never ticks the box) |
| `attribution` | Step 1 | Author / author URL / source license |
| `license` | Step 1 | The declared license + hosting outcome |
| `eligibility` | Step 1 | A one-line scope reminder |
| `file` | Step 2 | The file list (hosted) or the source link (referenced) |
| `product_target` | Step 4 | The linked-products list |
| *(roll-up of all six)* | Step 5 | The publish button, with jump links to any unmet criterion |

Step 1 renders four criteria but creates the draft at its end, so criteria ticked before the draft exists are held in client state and flushed by a follow-up `PATCH` immediately after creation, together with the category.

The **rejection recorder** (`POST /api/curation/rejections`) is reachable from Step 1 onward — the early-rejection property is preserved even though the step it lived on is gone.

The **non-blocking completeness flags** (`CURATION_FLAGS`) likewise stop being a panel: each positive confirmation renders next to its subject. `placement.ts` drives both the rendering and the per-step `PATCH`, so a flag cannot be shown on one step and saved by another. Initialization (all five unconfirmed on a fresh draft) and column semantics are unchanged.

The `curation_checklist` / `originality_attested` separation is deliberately preserved: one records a third party's judgement of someone else's part, the other a contributor's declaration about their own work.

## Resume

Both tools used to resume at a hardcoded step (Files for upload, Checklist for curation). Unified rule: **a resumed draft opens at the first step containing an unmet publish blocker**, falling back to Review when none remain.

`lib/publish/blockers.ts` mirrors both gates as pure functions returning blockers tagged with the step that owns them, so the resume step and the "still needed before publishing" list are one derivation. It is a mirror only — no server change, and the gates stay the authority.

## Publish gates

Unchanged, both of them — including HTTP 422 with `blockers[]`, server-side re-validation of everything, and the payload narrowing (400 on any narrowed key, presence-based, rejected not stripped).

## What this deliberately does not do

- **No merged API.** Two endpoint families, two gates, two scoped query sets.
- **No bulk import, no auto-publish.** The elsewhere track stays unitary and judged; the review screen stays in the path.
- **No curator role.** Any authenticated user, both tracks. Quality is enforced by the server gates, not by access control.
- **No change to `origin_type` semantics.** In particular, no `(original, link_out)` combination.
- **No new extractors.** Pre-fill remains Printables-only.
- **No `manufacturer` origin, no contributor-facing brand creation.**

## Key files

```
app/(dashboard)/publish/page.tsx           Entry: orientation question + merged drafts
components/publish/
  orientation-question.tsx                 The one branching decision
  original-track.tsx                        Original-track orchestrator
  elsewhere-track.tsx                       Elsewhere-track orchestrator
  files-step.tsx, details-step.tsx,         Steps shared by both tracks
  compatibility-step.tsx, review-step.tsx
  step-nav.tsx, registered-images.tsx       Shared step furniture
  judgement-checkbox.tsx                    One criterion or flag, rendered inline
  checklist-rollup.tsx                      Review roll-up with jump links
  legal-review-escalation.tsx               needs_legal_review + justification
  rejection-recorder.tsx                    Rejection traceability
  demand-panel.tsx                          Aggregate part-request counts
lib/publish/
  steps.ts                                  Labels, indices, resume rule
  placement.ts                              Which step renders which judgement
  blockers.ts                               Local mirrors of both publish gates
  drafts.ts                                 Client-side merge of both drafts lists
  tracks.ts                                 The two tracks and the question
lib/utils/publication.ts                    Storage pair → reader vocabulary
```

## References

- `docs/UPLOAD_FLOW.md` — original track engine (unchanged)
- `docs/CURATION_TOOL.md` — elsewhere track engine (unchanged)
- `docs/user-flows.md` — Flows P2, P3
- Issues #301, #302, #303 (this flow), #293 (upload flow), #254 (curation tool), #299 (author card label)
