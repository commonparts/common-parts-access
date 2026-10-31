-- Migration: count search misses per day (issue #456)
--
-- `/search` logs an unserved search each time the page is rendered on the
-- server (#320, #452). A reload, a back navigation or a tab the browser
-- restores renders the page again and logs the same search again, so one
-- visitor can produce several rows for one search. `fetch_top_search_misses()`
-- counted rows, which over-ranked a query that a single visitor reloaded.
--
-- What this migration does:
--
--   Replaces `fetch_top_search_misses()` so that `miss_count` is the number of
--   distinct days, in UTC, on which the query was logged in the window,
--   instead of the number of rows. Two rows on the same day count as 1; rows
--   on two days count as 2. `raw_query`, `outcome` and `last_seen` still come
--   from the latest row, the outcome filter (#452) still applies to the
--   latest outcome, and the order is unchanged (`miss_count`, then
--   `last_seen`). Logging is unchanged: rows are still written on each render.
--
--   The window now starts at midnight UTC and covers exactly `since_days`
--   calendar days, today included. The rolling window it replaces
--   (`now() - since_days`) touched `since_days + 1` dates, so a query
--   searched every day would have shown 31 days under "Last 30 days".
--
-- The column keeps its name `miss_count`: the release in production reads it
-- by that name, and the signature and return type are unchanged, so
-- CREATE OR REPLACE keeps the grants and the code in production keeps
-- working. The migration is therefore applied when the PR lands on `dev`.
--
-- No new index: the window is still a range on `created_at`, served by
-- `idx_search_misses_created_at`, and the day is computed after it.

create or replace function public.fetch_top_search_misses(
  since_days integer default 30,
  result_limit integer default 50,
  outcome_filter text default null
)
returns table (
  normalized_query text,
  raw_query        text,
  outcome          text,
  miss_count       integer,
  last_seen        timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with grouped as (
    select
      m.normalized_query,
      -- The latest spelling and the latest outcome stand for the group: the
      -- outcome follows the catalog, which changes between two searches.
      (pg_catalog.array_agg(m.raw_query order by m.created_at desc))[1] as raw_query,
      (pg_catalog.array_agg(m.outcome order by m.created_at desc))[1] as outcome,
      -- Days, not rows (#456): a page render logs a row, so reloads by one
      -- visitor would otherwise count as several searches. Days are in UTC,
      -- whatever the session time zone.
      pg_catalog.count(distinct (m.created_at at time zone 'UTC')::date)::int as miss_count,
      max(m.created_at) as last_seen
    from public.search_misses m
    -- Midnight UTC `since_days - 1` days ago: the count is per UTC day, so
    -- the window is made of whole UTC days, today included.
    where m.created_at >= (
      pg_catalog.date_trunc('day', now() at time zone 'UTC')
      - pg_catalog.make_interval(days => least(greatest(coalesce(since_days, 30), 1), 365) - 1)
    ) at time zone 'UTC'
    group by m.normalized_query
  )
  select g.normalized_query, g.raw_query, g.outcome, g.miss_count, g.last_seen
  from grouped g
  where outcome_filter is null or g.outcome = outcome_filter
  order by g.miss_count desc, g.last_seen desc
  limit least(greatest(coalesce(result_limit, 50), 1), 200)
$$;

comment on function public.fetch_top_search_misses(integer, integer, text) is
  'Unserved searches of the last since_days UTC days (today included), ranked by the number of distinct UTC days each query was logged, optionally filtered by latest outcome (issues #320, #452, #456). Service role only.';

-- CREATE OR REPLACE keeps the existing grants (20261030104338); restated so
-- the file holds them.
revoke execute on function public.fetch_top_search_misses(integer, integer, text) from public, anon, authenticated;
grant execute on function public.fetch_top_search_misses(integer, integer, text) to service_role;
