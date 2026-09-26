-- Migration: zero-result searches and user-attached references (issue #320)
--
-- A search that finds nothing is the clearest signal of unmet demand, and
-- when it is a reference we do not know, the visitor usually knows which
-- product it belongs to. This migration records the misses and lets a
-- visitor's answer enter `product_references` as a pending suggestion.
--
-- What this migration does, in order:
--
--   1. Adds `product_references.status`: pending | validated | rejected.
--      Existing and curated rows are `validated` (the default); the
--      attachment flow inserts `pending` rows with `source = 'search'`.
--      There is no admin role: validating means setting `status` to
--      `validated` (or `rejected`) in the Supabase dashboard.
--   2. Narrows the public read policy to validated references. Every reader
--      goes through it: the product page, the part details route and
--      `search_all`, which is security invoker, so a pending reference is
--      never displayed nor matched until it is validated. A partial index
--      serves the pending queue.
--   3. Creates `search_misses`, one row per zero-result search submitted on
--      /search (autocomplete keystrokes are not logged):
--        - `raw_query`        as typed, trimmed
--        - `normalized_query` generated: accent-folded, then the reference
--                             normalization, so "Kärcher K 3" and "karcher k3"
--                             count as the same miss
--        - `locale`           the visitor's language and region from
--                             Accept-Language ("fr-FR"), nullable
--        - `created_at`
--      No IP, no user id, no session id. RLS is enabled with no policy and
--      client privileges are revoked: the /search page inserts with the
--      service role, after the search itself returned nothing.
--   4. Adds `search_product_candidates()`: products whose brand and name
--      match a query, across the whole catalog (not only products with a
--      published part: an unknown reference usually belongs to a product
--      nobody has published a part for yet). Feeds the "which product is
--      it?" picker on the zero-result page.
--   5. Adds the two reads behind /dashboard/search-demand, executable by
--      signed-in users only (as the curation tool, not role-gated):
--        - `fetch_top_search_misses()` most frequent misses in a window
--        - `fetch_pending_product_references()` the validation queue
--
-- APPLIED to production on 2026-09-26 as version 20260925220000.

-- 1. Validation status.
alter table public.product_references
  add column status text not null default 'validated'
    check (status in ('pending', 'validated', 'rejected'));

comment on column public.product_references.status is
  'pending = suggested from a zero-result search, awaiting review; only validated references are readable and searchable.';

-- 2. Public reads see validated references only.
drop policy "Product references are publicly readable" on public.product_references;

create policy "Validated product references are publicly readable"
  on public.product_references
  for select
  using (status = 'validated');

create index idx_product_references_pending
  on public.product_references (created_at desc)
  where status = 'pending';

-- 3. Zero-result searches.
create table public.search_misses (
  id               uuid primary key default gen_random_uuid(),
  raw_query        text not null
                   check (raw_query = btrim(raw_query) and length(raw_query) between 1 and 100),
  normalized_query text not null
                   generated always as (
                     public.normalize_product_reference(public.fold_search_text(raw_query))
                   ) stored,
  locale           text
                   check (locale ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
  created_at       timestamptz not null default now(),
  -- A query made only of separators cannot be grouped with anything.
  constraint search_misses_normalized_not_empty check (normalized_query <> '')
);

comment on table public.search_misses is
  'Searches submitted on /search that returned nothing (issue #320). No personal data.';

-- The dashboard aggregates over a recent window.
create index idx_search_misses_created_at on public.search_misses (created_at desc);

alter table public.search_misses enable row level security;
revoke all on public.search_misses from anon, authenticated;

-- 4. Product candidates for the attachment picker.
create or replace function public.search_product_candidates(search_query text, result_limit integer default 6)
returns table (id uuid, name text, slug text, brand_name text)
language sql
stable
set search_path = ''
as $$
  with query as (
    select
      public.fold_search_text(btrim(coalesce(search_query, ''))) as folded,
      array(
        select t
        from pg_catalog.unnest(pg_catalog.regexp_split_to_array(
          public.fold_search_text(btrim(coalesce(search_query, ''))), '\s+'
        )) as t
        where t <> ''
      ) as tokens,
      least(greatest(coalesce(result_limit, 6), 1), 20) as lim
  ),
  scored as (
    select
      p.id, p.name, p.slug, b.name as brand_name,
      public.search_token_coverage(pg_catalog.concat_ws(' ', b.name, p.name), q.tokens) as coverage,
      public.word_similarity(q.folded, public.fold_search_text(pg_catalog.concat_ws(' ', b.name, p.name))) as fuzzy
    from public.products p
    left join public.brands b on b.id = p.brand_id
    cross join query q
    where q.folded <> ''
  )
  select s.id, s.name, s.slug, s.brand_name
  from scored s
  -- At least half the tokens found: a whole-query trigram fallback lets a
  -- reference ("QP6520/20") drag in any name sharing a "/20".
  where s.coverage >= 0.5
  order by s.coverage * 2 + s.fuzzy desc, s.name
  limit (select lim from query)
$$;

comment on function public.search_product_candidates(text, integer) is
  'Products (any, with or without parts) whose brand and name match a query; the zero-result reference picker (issue #320).';


-- 5. Dashboard reads, signed-in users only.
create or replace function public.fetch_top_search_misses(since_days integer default 30, result_limit integer default 50)
returns table (normalized_query text, raw_query text, miss_count integer, last_seen timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select
    m.normalized_query,
    -- The latest spelling stands for the group.
    (pg_catalog.array_agg(m.raw_query order by m.created_at desc))[1] as raw_query,
    count(*)::int as miss_count,
    max(m.created_at) as last_seen
  from public.search_misses m
  where m.created_at >= now() - pg_catalog.make_interval(
    days => least(greatest(coalesce(since_days, 30), 1), 365)
  )
  group by m.normalized_query
  order by miss_count desc, last_seen desc
  limit least(greatest(coalesce(result_limit, 50), 1), 200)
$$;

comment on function public.fetch_top_search_misses(integer, integer) is
  'Most frequent zero-result searches over the last since_days days (issue #320). Signed-in users only.';

create or replace function public.fetch_pending_product_references(result_limit integer default 50)
returns table (
  id           uuid,
  value        text,
  type         text,
  region       text,
  language     text,
  created_at   timestamptz,
  product_name text,
  product_slug text,
  brand_name   text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id, r.value, r.type, r.region, r.language, r.created_at,
    p.name, p.slug, b.name
  from public.product_references r
  join public.products p on p.id = r.product_id
  left join public.brands b on b.id = p.brand_id
  where r.status = 'pending'
  order by r.created_at desc
  limit least(greatest(coalesce(result_limit, 50), 1), 200)
$$;

comment on function public.fetch_pending_product_references(integer) is
  'References suggested from zero-result searches, awaiting validation (issue #320). Signed-in users only.';

revoke execute on function public.fetch_top_search_misses(integer, integer) from public, anon;
revoke execute on function public.fetch_pending_product_references(integer) from public, anon;
grant execute on function public.fetch_top_search_misses(integer, integer) to authenticated;
grant execute on function public.fetch_pending_product_references(integer) to authenticated;
