# Part View Tracking

## Overview
This document explains how Common Parts Access counts part views using a lightweight POST endpoint plus a Supabase trigger that increments `parts.view_count`.

Views are anonymous, like downloads (issues #250 and #324): a `part_views` row records the part and the time, nothing about the visitor — no user id, no IP address in any form, no user agent.

## Flow
1. Part detail page mounts and issues `POST /api/parts/[slug]/view` once (guarded on the client).
2. API resolves the part by slug (published only).
3. API inserts one anonymous row into `part_views`; a DB trigger increments `parts.view_count`.
4. Response returns `{ success: true, views }`, where `views` is the optimistic count.

## API Contract
- **Endpoint:** `POST /api/parts/[slug]/view`
- **Request body:** none
- **Headers used:** none
- **Responses:**
  - `200` with `{ success: true, views: number }`
  - `404` if the part is missing or unpublished
  - `500` for unexpected errors (view not recorded)

## Deduplication
There is no server-side deduplication: deduplicating would require identifying the visitor, which the platform does not do. The only guard is client-side — `components/part/part-details.tsx` posts once per page mount via a `useRef`. A reload counts as a new view.

## Data Captured
Inserted into `part_views`:
- `part_id` (FK to `parts`)
- `viewed_at` (timestamp, defaults to `now()`)

## Database Requirements
- Table: `part_views` with `id`, `part_id`, `viewed_at`.
- Trigger: AFTER INSERT on `part_views` that increments `parts.view_count` for the associated `part_id`.
- RLS:
  - `INSERT`: "Anyone can log anonymous views on published parts" — any caller, signed in or not, for a published part.
  - `SELECT`: service role only.

## Client Usage
- `components/part/part-details.tsx` calls the endpoint in `useEffect` with a `useRef` guard to avoid duplicate posts.
- No payload required; failures are logged to the console and do not block the page.
