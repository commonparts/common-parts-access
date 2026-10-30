-- Migration: log searches answered only by close matches (issue #452)
--
-- Search miss logging (#320) fired only when `search_all` returned nothing.
-- It almost never does: any product or part whose text has a trigram word
-- similarity above 0.3 with the query is returned, so "mini cooper" came
-- back with six unrelated "Mini" products and three hair clipper combs
-- ("clipper" is close to "cooper"), and nothing was logged.
--
-- A search is now served when at least one hit both:
--   - is a part, or a product with a published part (`parts_count > 0`);
--   - matches the query fully: a reference hit, full token coverage
--     (`coverage >= 1`) or a full-text match.
-- Hits that come in through trigram similarity or partial coverage alone are
-- close matches, and never make a search served.
--
-- What this migration does, in order:
--
--   1. Replaces `search_all`: every product and part hit carries
--      `full_match`, the match quality defined above, so the /search page
--      tells a served search from an unserved one without recomputing it.
--      Full matches lead the order within each group (after reference hits
--      for products), so a full match is never cut by the result limit in
--      favour of close matches. Matching, visibility and scores are otherwise
--      unchanged from 20260926120000. Autocomplete ignores the new field.
--   2. Adds `search_misses.outcome`, why the logged search was unserved:
--        - `no_results`   nothing returned (the only case logged before);
--        - `approximate`  only close matches;
--        - `no_parts`     the query fully matches a product without any
--                         published part.
--      Existing rows, if any, default to `no_results`.
--   3. Replaces `fetch_top_search_misses()` with an optional `outcome_filter`
--      argument and an `outcome` column: the latest outcome of each group,
--      as the latest spelling stands for the group. Misses are counted over
--      every outcome, so the count still measures demand for the query. The
--      new argument changes the signature, so the old function is dropped and
--      recreated in this transaction, with the same grants (#440).
--
-- Compatibility with the release in production: the new `search_all` field
-- and `fetch_top_search_misses` column are ignored by that code, which calls
-- `fetch_top_search_misses(since_days, result_limit)` by name and resolves to
-- the new function through the default of `outcome_filter`; its inserts into
-- `search_misses` omit `outcome` and get the default. The migration is
-- therefore applied when the PR lands on `dev`.
--
-- No new index: the outcome filter applies to at most one group per
-- normalized query, after the aggregation over the time window that
-- `idx_search_misses_created_at` already serves.

-- ============================================================================
-- 1. search_all
-- ============================================================================

create or replace function public.search_all(search_query text, result_limit integer default 5)
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
  with params as (
    select
      btrim(coalesce(search_query, '')) as raw,
      least(greatest(coalesce(result_limit, 5), 1), 20) as lim
  ),
  query as (
    select
      p.raw,
      p.lim,
      fold_search_text(p.raw) as folded,
      websearch_to_tsquery('english', fold_search_text(p.raw)) as tsq,
      array(
        select t
        from unnest(regexp_split_to_array(fold_search_text(p.raw), '\s+')) as t
        where t <> ''
      ) as tokens,
      -- Same rule as stored references; LIKE wildcards escaped since `%` and
      -- `_` survive the normalization.
      replace(replace(replace(
        normalize_product_reference(p.raw), '\', '\\'), '%', '\%'), '_', '\_'
      ) as ref_pattern,
      normalize_product_reference(p.raw) as ref_value
    from params p
  ),
  -- Reference hits, one row per product: the best matching reference.
  ref_hits as (
    select distinct on (r.product_id)
      r.product_id,
      r.value as reference,
      case when r.normalized_value = q.ref_value then 8 else 6 end as ref_score
    from public.product_references r, query q
    where length(q.ref_value) >= 3
      and r.normalized_value like q.ref_pattern || '%'
    order by r.product_id, (r.normalized_value = q.ref_value) desc, length(r.normalized_value), r.value
  ),
  -- Every product is searchable (issue #321): an unlisted one is how a
  -- visitor reaches a device nobody has published or requested a part for.
  product_docs as (
    select
      pr.id, pr.name, pr.slug, pr.image_url,
      pr.parts_count, pr.is_listed, c.name as category,
      fold_search_text(concat_ws(' ', b.name, pr.name)) as doc,
      rh.reference, coalesce(rh.ref_score, 0) as ref_score
    from public.products pr
    left join public.brands b on b.id = pr.brand_id
    left join public.categories c on c.id = pr.category_id
    left join ref_hits rh on rh.product_id = pr.id
  ),
  product_scored as (
    select
      d.*,
      search_token_coverage(d.doc, q.tokens) as coverage,
      to_tsvector('english', d.doc) @@ q.tsq as fts,
      ts_rank(to_tsvector('english', d.doc), q.tsq) as rank,
      word_similarity(q.folded, d.doc) as fuzzy
    from product_docs d, query q
    where q.raw <> ''
  ),
  product_hits as (
    select
      s.id, s.name, s.slug, s.image_url, s.category, s.parts_count, s.reference,
      s.ref_score,
      -- Full match (issue #452): every query token found, a full-text match
      -- or a reference hit. A hit above the trigram threshold alone is a
      -- close match.
      (s.ref_score > 0 or s.coverage >= 1 or s.fts) as full_match,
      -- Listed bonus 1: ahead of an unlisted product matching as well.
      s.ref_score + s.coverage * 2 + s.rank * 4 + s.fuzzy
        + case when s.is_listed then 1 else 0 end as score
    from product_scored s
    where s.ref_score > 0 or s.coverage >= 1 or s.fts or s.fuzzy > 0.3
    -- ref_score leads the order (exact 8, prefix 6, none 0) so a reference
    -- hit always outranks a name hit, whatever the name-match score and the
    -- listed bonus add up to; full matches come before close matches, and
    -- the score orders products within each tier.
    order by s.ref_score desc, full_match desc, score desc, s.name
    limit (select lim from params)
  ),
  part_docs as (
    select
      pt.id, pt.name, pt.slug, pt.part_name, pt.part_number, pt.thumbnail_url,
      l.short_name as license,
      min(lp.name) as product_name,
      fold_search_text(concat_ws(' ',
        pt.name,
        pt.part_name,
        pt.part_number,
        array_to_string(pt.tags, ' '),
        string_agg(distinct lp.name, ' '),
        string_agg(distinct lb.name, ' ')
      )) as doc,
      coalesce(max(rh.ref_score), 0) as ref_score
    from public.parts pt
    left join public.licenses l on l.id = pt.license_id
    left join public.part_products mp on mp.part_id = pt.id
    left join public.products lp on lp.id = mp.product_id
    left join public.brands lb on lb.id = lp.brand_id
    left join ref_hits rh on rh.product_id = mp.product_id
    where pt.status = 'published'
    group by pt.id, l.short_name
  ),
  part_scored as (
    select
      d.*,
      search_token_coverage(d.doc, q.tokens) as coverage,
      to_tsvector('english', d.doc) @@ q.tsq as fts,
      ts_rank(to_tsvector('english', d.doc), q.tsq) as rank,
      word_similarity(q.folded, d.doc) as fuzzy
    from part_docs d, query q
    where q.raw <> ''
  ),
  part_hits as (
    select
      s.id, s.name, s.slug, s.part_name, s.part_number, s.thumbnail_url,
      s.license, s.product_name,
      -- Same definition as product_hits.full_match.
      (s.ref_score > 0 or s.coverage >= 1 or s.fts) as full_match,
      s.ref_score + s.coverage * 2 + s.rank * 4 + s.fuzzy as score
    from part_scored s
    where s.ref_score > 0 or s.coverage >= 1 or s.fts or s.fuzzy > 0.3
    order by full_match desc, score desc, s.name
    limit (select lim from params)
  ),
  -- Only brands holding a listed product are searchable (issues #312, #321).
  brand_scored as (
    select
      b.id, b.name, b.slug, b.logo_url,
      search_token_coverage(b.name, q.tokens) as coverage,
      to_tsvector('english', fold_search_text(concat_ws(' ', b.name, b.description))) @@ q.tsq as fts,
      ts_rank(to_tsvector('english', fold_search_text(concat_ws(' ', b.name, b.description))), q.tsq) as rank,
      word_similarity(q.folded, fold_search_text(b.name)) as fuzzy,
      -- Reversed operands: how much of the brand name appears in the query.
      word_similarity(fold_search_text(b.name), q.folded) as named
    from public.brands b, query q
    where q.raw <> ''
      and exists (
        select 1 from public.products p
        where p.brand_id = b.id and p.is_listed
      )
  ),
  brand_hits as (
    select
      s.id, s.name, s.slug, s.logo_url,
      s.coverage * 2 + s.rank * 4 + s.fuzzy as score
    from brand_scored s
    -- A query naming the brand is enough ("karcher k3" lists Kärcher): the
    -- rest of it usually names a product. Token coverage is not used as the
    -- condition here, since a one-letter token ("k" in "K 3") is contained in
    -- unrelated brand names.
    where s.named >= 0.5 or s.fts or s.fuzzy > 0.3
    order by score desc, s.name
    limit (select lim from params)
  ),
  -- product_count counts products with a published part, matching the hub.
  brand_results as (
    select
      h.id, h.name, h.slug, h.logo_url, h.score,
      coalesce(pc.product_count, 0) as product_count
    from brand_hits h
    left join (
      select p.brand_id, count(*)::int as product_count
      from public.products p
      where p.brand_id in (select id from brand_hits)
        and p.parts_count > 0
      group by p.brand_id
    ) pc on pc.brand_id = h.id
  )
  select jsonb_build_object(
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'slug', slug,
        'image_url', image_url,
        'category', category,
        'parts_count', parts_count,
        'reference', reference,
        'full_match', full_match
      ) order by ref_score desc, full_match desc, score desc, name)
      from product_hits
    ), '[]'::jsonb),
    'parts', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'slug', slug,
        'part_name', part_name,
        'part_number', part_number,
        'thumbnail_url', thumbnail_url,
        'product_name', product_name,
        'license', license,
        'full_match', full_match,
        'brands', coalesce((
          select jsonb_agg(jsonb_build_object('name', pb.name, 'slug', pb.slug) order by pb.name)
          from (
            select distinct b.name, b.slug
            from public.part_products mp
            join public.products p on p.id = mp.product_id
            join public.brands b on b.id = p.brand_id
            where mp.part_id = part_hits.id
          ) pb
        ), '[]'::jsonb),
        'products', coalesce((
          select jsonb_agg(jsonb_build_object('name', pp.name, 'slug', pp.slug) order by pp.name)
          from (
            select p.name, p.slug
            from public.part_products mp
            join public.products p on p.id = mp.product_id
            where mp.part_id = part_hits.id
            order by p.name
            limit 2
          ) pp
        ), '[]'::jsonb),
        'product_count', (
          select count(*)::int
          from public.part_products mp
          where mp.part_id = part_hits.id
        )
      ) order by full_match desc, score desc, name)
      from part_hits
    ), '[]'::jsonb),
    'brands', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'slug', slug,
        'logo_url', logo_url,
        'product_count', product_count
      ) order by score desc, name)
      from brand_results
    ), '[]'::jsonb)
  );
$function$;

-- CREATE OR REPLACE keeps the existing grants; restated so the file holds them.
grant execute on function public.search_all(text, integer) to anon, authenticated, service_role;

-- ============================================================================
-- 2. search_misses.outcome
-- ============================================================================

alter table public.search_misses
  add column outcome text not null default 'no_results'
    check (outcome in ('no_results', 'approximate', 'no_parts'));

comment on column public.search_misses.outcome is
  'Why the search was unserved (issue #452): no_results = nothing returned, approximate = close matches only, no_parts = fully matches a product without a published part.';

comment on table public.search_misses is
  'Searches submitted on /search that no full match with a published part answered (issues #320, #452). No personal data.';

-- ============================================================================
-- 3. fetch_top_search_misses
-- ============================================================================

drop function public.fetch_top_search_misses(integer, integer);

create function public.fetch_top_search_misses(
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
      count(*)::int as miss_count,
      max(m.created_at) as last_seen
    from public.search_misses m
    where m.created_at >= now() - pg_catalog.make_interval(
      days => least(greatest(coalesce(since_days, 30), 1), 365)
    )
    group by m.normalized_query
  )
  select g.normalized_query, g.raw_query, g.outcome, g.miss_count, g.last_seen
  from grouped g
  where outcome_filter is null or g.outcome = outcome_filter
  order by g.miss_count desc, g.last_seen desc
  limit least(greatest(coalesce(result_limit, 50), 1), 200)
$$;

comment on function public.fetch_top_search_misses(integer, integer, text) is
  'Most frequent unserved searches over the last since_days days, optionally filtered by latest outcome (issues #320, #452). Service role only.';

-- Same grants as 20261026222442: the dashboard calls it with the service role,
-- after the curator check.
revoke execute on function public.fetch_top_search_misses(integer, integer, text) from public, anon, authenticated;
grant execute on function public.fetch_top_search_misses(integer, integer, text) to service_role;
