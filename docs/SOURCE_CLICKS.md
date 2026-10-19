# Source Click Tracking

## Overview
For a referenced part, the action that matters is the click that sends the visitor to the part's page on its source platform. Common Parts Access records each such click anonymously (issue #375), so it can say how many visits it sends to source platforms and designers, and which referenced parts are used.

Clicks are anonymous, like views and downloads (issues #250 and #324): a `part_source_clicks` row records the part, where the link was clicked and the time, nothing about the visitor — no user id, no IP address in any form, no user agent. No counter is kept on the part, and no figure is displayed on public pages; public counters and popularity-based ordering are out of scope.

## Which links are counted
Every link to the part's source, rendered by the `SourceLink` component (`components/part/source-link.tsx`):

| Link | Where | `context` |
|---|---|---|
| "View on {platform}" primary button (`link_out` parts) | Part page | `part_page` |
| "Original Post" link in the Attribution & License card | Part page | `part_page` |
| Source platform name on the provenance line | Every part card: browse grid, home page section, search results, product page | `card` |

The "Original design by {author}" link points to the designer's profile, not to the part's source, and is not counted.

## Flow
1. The visitor clicks a source link. The link opens in a new tab; the click is never delayed.
2. `sendSourceClick()` (`lib/utils/source-clicks.ts`) queues `POST /api/parts/[slug]/source-click` with `navigator.sendBeacon`, falling back to `fetch` with `keepalive` when the beacon is unavailable or refused. Failures are logged to the console and never block the link.
3. The API validates the slug and the context, resolves the part by slug (published only) and inserts one row into `part_source_clicks` through `recordPartSourceClick()` (`lib/supabase/queries/part-metrics.ts`).

A left click (with or without a modifier key) and a middle click are recorded. Opening the link from the context menu is not: no click event reaches the page.

## Automated traffic
A click is recorded only by the click handler of the link, which runs in the browser. Crawlers that follow the `href` run no handler and are never counted. No other filtering is applied: the platform does not identify visitors, so a headless browser that clicks the link, or a direct request to the endpoint, is counted. There is no server-side deduplication, for the same reason as views (see [PART_VIEWS.md](./PART_VIEWS.md#deduplication)).

## API Contract
- **Endpoint:** `POST /api/parts/[slug]/source-click`
- **Request body:** `{ "context": "part_page" | "card" }`
- **Responses:**
  - `200` with `{ success: true }`
  - `400` if the slug, the JSON body or the context is invalid
  - `404` if the part is missing or unpublished
  - `500` for unexpected errors (click not recorded)

## Database
- Table: `part_source_clicks` with `id`, `part_id` (FK to `parts`, cascade delete), `context` (`part_page` / `card`), `clicked_at` (defaults to `now()`).
- Index: `(part_id, clicked_at desc)`.
- RLS:
  - `INSERT`: "Anyone can log anonymous source clicks on published parts" — any caller, signed in or not, for a published part.
  - No `SELECT` policy: only the service role reads the rows, and it bypasses RLS.
- Grants (#131): `INSERT` to `anon` and `authenticated` (the insert does not read the row back); `SELECT`, `INSERT`, `UPDATE`, `DELETE` to `service_role`. See [Data API grants](./DATA_MODEL.md#data-api-grants).
- Migration: `supabase/migrations/20261019185953_part_source_clicks.sql`.

## Aggregates
The rows are read with the service role (Supabase dashboard or SQL). The source platform is not stored on the row: per-platform figures join the part's current `source_platform` to `source_platforms.slug`.

```sql
-- Clicks per source platform over the last 30 days
select sp.name as platform, count(*) as clicks
from public.part_source_clicks c
join public.parts p on p.id = c.part_id
join public.source_platforms sp on sp.slug = p.source_platform
where c.clicked_at >= now() - interval '30 days'
group by sp.name
order by clicks desc;

-- Clicks per part, split by context
select p.slug, c.context, count(*) as clicks
from public.part_source_clicks c
join public.parts p on p.id = c.part_id
group by p.slug, c.context
order by clicks desc
limit 50;
```

## Privacy
The privacy policy (`app/(legal)/privacy/page.tsx`, section 3.3) lists source clicks with views and downloads as counted anonymously.
