# Model View Tracking

## Overview
This document explains how Common Parts Access tracks model views using a lightweight POST endpoint plus Supabase triggers to increment `models.view_count`.

## Flow
1. Model detail page mounts and issues `POST /api/models/[slug]/view` once (guarded on the client).
2. API resolves the model by slug (published only) and gathers request metadata.
3. Request IP and user agent are hashed with SHA-256 to create an `ip_hash` fingerprint.
4. Server checks `model_views` for a recent view within the throttle window (30 minutes) for either the authenticated user or the hashed IP+UA combo.
5. If no recent view, the API inserts a row into `model_views` and a DB trigger increments `models.view_count`.
6. Response returns `{ success: true, views }`, where `views` is the optimistic count.

## API Contract
- **Endpoint:** `POST /api/models/[slug]/view`
- **Runtime:** `nodejs`
- **Request body:** none
- **Headers used:** `user-agent`, `x-forwarded-for` (or `x-real-ip`) for hashing
- **Responses:**
  - `200` with `{ success: true, views: number }`
  - `404` if the model is missing or unpublished
  - `500` for unexpected errors (view not recorded)

## Throttling Rules
- Window: 30 minutes (`RECENT_WINDOW_MINUTES`).
- Throttle key priority:
  - Authenticated users: `user_id` match.
  - Anonymous users: `ip_hash` (SHA-256 of IP + user agent).
- If a matching view exists in the window, the insert is skipped and count remains unchanged.

## Data Captured
Inserted into `model_views` when allowed:
- `model_id` (FK to `models`)
- `user_id` (nullable)
- `ip_hash` (hashed IP + UA, never the raw IP)
- `user_agent`
- `viewed_at` (timestamp, defaults to `now()`)

## Database Requirements
- Table: `model_views` with columns above, plus PK `id` and timestamps.
- Indexes:
  - `(model_id, viewed_at desc)` for recent lookups
  - `(user_id, viewed_at desc)` (partial: `WHERE user_id IS NOT NULL`)
  - `(ip_hash, viewed_at desc)` (partial: `WHERE user_id IS NULL`)
- Trigger: AFTER INSERT on `model_views` that increments `models.view_count` for the associated `model_id`.
- RLS suggestions:
  - `SELECT` enabled for service roles; optional for analytics UI.
  - `INSERT` allowed to authenticated users; consider a policy permitting anonymous inserts by the edge function role if needed.

## Client Usage
- `components/model/model-details.tsx` calls the endpoint in `useEffect` with a `useRef` guard to avoid duplicate posts.
- No payload required; failures are logged to the console and do not block the page.

## Operational Notes
- Hashing means IP addresses are never stored in plaintext.
- The optimistic `views` field adds `1` only when an insert is attempted; final authority remains the database trigger-maintained `view_count`.
- Keep the route on the Node runtime because it uses the `crypto` module.
