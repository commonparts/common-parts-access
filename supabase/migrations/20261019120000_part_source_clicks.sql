-- Migration: anonymous clicks to a part's source (issue #375)
--
-- Every published part keeps its files at the source: the action that
-- matters on a referenced part is the click that sends the visitor to the
-- designer's page. That click was not recorded, so the index could not say
-- how many visits it sends to source platforms and designers, nor which
-- referenced parts are actually used.
--
-- Clicks follow views and downloads (issues #250 and #324): a row carries
-- the part, where the link was clicked and the moment, nothing about the
-- visitor (no user id, no IP address in any form, no user agent). No
-- counter is kept on the part and no figure is displayed publicly.
--
-- What this migration does, in order:
--
--   1. Creates `part_source_clicks`:
--        - `part_id`    the part whose source link was clicked
--        - `context`    where the link was clicked: `part_page` (the primary
--                       button or the Original post link of the part page)
--                       or `card` (the provenance line of a part card)
--        - `clicked_at`
--      The source platform is not stored: per-platform figures join
--      `parts.source_platform` to `source_platforms.slug`.
--   2. Indexes `(part_id, clicked_at desc)` for per-part aggregates over a
--      period, as `part_downloads` does.
--   3. Enables RLS with one insert policy, as on `part_views` and
--      `part_downloads`: anyone, signed in or not, may log a click on a
--      published part. There is no select policy: only the service role
--      reads the rows, and it bypasses RLS.
--   4. Grants the Data API roles their privileges, as new tables receive
--      none by default (#131): INSERT to `anon` and `authenticated`, the
--      only command their policy lets through (the app inserts without
--      reading the row back, as for `part_requests`); SELECT, INSERT,
--      UPDATE and DELETE to `service_role`.
--
-- Additive: applied by the human when the PR lands on `dev`. Until then the
-- endpoint answers 500 and no click is recorded; the links keep working.

-- 1. Table ---------------------------------------------------------------------

create table public.part_source_clicks (
  id         uuid primary key default gen_random_uuid(),
  part_id    uuid not null references public.parts(id) on delete cascade,
  context    text not null check (context in ('part_page', 'card')),
  clicked_at timestamptz not null default now()
);

comment on table public.part_source_clicks is
  'Anonymous clicks on the source link of a part (issue #375): the part, where the link was clicked and the time, nothing about the visitor.';

comment on column public.part_source_clicks.context is
  'part_page = primary button or Original post link of the part page; card = provenance line of a part card.';

-- 2. Index ---------------------------------------------------------------------

create index idx_part_source_clicks_recent
  on public.part_source_clicks (part_id, clicked_at desc);

-- 3. RLS -----------------------------------------------------------------------

alter table public.part_source_clicks enable row level security;

create policy "Anyone can log anonymous source clicks on published parts"
  on public.part_source_clicks for insert
  with check (
    exists (
      select 1 from public.parts p
      where p.id = part_id and p.status = 'published'
    )
  );

-- 4. Data API grants -------------------------------------------------------------

grant insert on public.part_source_clicks to anon, authenticated;
grant select, insert, update, delete on public.part_source_clicks to service_role;
