# Model Likes

## Overview
This document covers how PartHarbor tracks model likes via a RESTful endpoint plus database constraints/triggers that keep `models.like_count` in sync.

## API Contract
- **Endpoint:** `/api/models/[slug]/likes`
- **Methods:**
  - `GET` — returns current like count and whether the viewer has liked
  - `POST` — like the model for the current user
  - `DELETE` — remove the like for the current user
- **Auth:** `POST`/`DELETE` require authentication; `GET` works for both anonymous and authenticated users.
- **Responses:**
  - Success shape: `{ likes: number, liked: boolean }`
  - Errors: `401` for unauthenticated mutations, `404` for missing/unpublished models, `500` on unexpected failures

## Flow
1. Client fetches model details (`/api/models/[slug]/details`); view-layer holds `viewerHasLiked` and `stats.likes`.
2. Like toggle calls `/api/models/[slug]/likes` with `POST` (to like) or `DELETE` (to unlike).
3. API resolves the model by slug (published only) and checks for an existing like row for the user.
4. Inserts or deletes from `model_likes` based on the request, respecting uniqueness.
5. Database trigger updates `models.like_count` after insert/delete.
6. API returns the optimistic like count (`baseLikes +/- 1`) along with the viewer state.

## Data Model
- Table: `model_likes`
  - `id` (PK)
  - `model_id` (FK -> `models.id`)
  - `user_id` (FK -> `auth.users.id`)
  - `created_at` timestamp
- Recommended constraints/indexes:
  - Unique index on (`model_id`, `user_id`) to enforce one like per user per model
  - Index on `user_id` for quick lookups
- Counter maintenance:
  - Trigger: AFTER INSERT increments `models.like_count`
  - Trigger: AFTER DELETE decrements `models.like_count` (bounded at zero)

## RLS Guidelines
- `SELECT` on `model_likes` allowed to authenticated users for their own rows (or via service role for analytics).
- `INSERT`/`DELETE` restricted to the authenticated user matching `user_id`.
- Published model check enforced in the API; keep RLS aligned to prevent liking unpublished/private models if applicable.

## Client Usage
- Component: `components/model/model-details.tsx` uses optimistic updates:
  - Immediately adjusts like count/UI, then calls the API.
  - On `401`, reverts the optimistic update and redirects to login with `redirect` query.
  - On failure, reverts the count and shows a toast/alert.
- `GET /likes` is called implicitly via the model details fetch; additional calls are not required unless you need to refresh state independently.

## Operational Notes
- Keep the trigger-based `like_count` authoritative; the API returns optimistic counts for snappy UX but the DB value wins on refresh.
- Ensure the unique constraint exists to avoid duplicate likes; the API checks and short-circuits if a like already exists.
- Auditing: If you need analytics, add columns (e.g., `ip_hash`) or a separate logging table rather than expanding `model_likes`.
