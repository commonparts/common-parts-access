-- Migration: hide categories, brands and products without published parts
-- from the public navigation and search (issue #312)
--
-- The navigation RPCs (fetch_browse_nav, fetch_category_page, fetch_brand_nav
-- from migration 20260716181406) and search_all (20260802141500) were written
-- with catalog-scope semantics: every indexed brand, category and product was
-- returned, and product counts counted every product, whether or not a
-- published part exists for it — "products without parts keep a row with a
-- null model so they still count". With 16 published parts against 871
-- products and 194 brands, that turns the hub into a wall of muted entries and
-- makes the catalog look empty.
--
-- This migration switches all four functions to availability semantics:
--
--   - a product counts (and lists) only when at least one published part is
--     linked to it;
--   - a brand or category node is returned only when its subtree holds at
--     least one such product, and its product_count counts those products
--     only — so "N parts across M products" never mentions products that
--     have nothing to offer;
--   - the /browse example-leaf microcopy only names leaves that have parts.
--
-- The page-level target of fetch_category_page (the category the URL names)
-- is still returned when it has no parts, like a brand page with no parts:
-- direct URLs keep rendering their availability notice; only the navigation
-- stops surfacing them. Unknown slugs still yield NULL (the route 404s).
--
-- Counting rules are unchanged otherwise: parts counts are DISTINCT published
-- parts per node (a part fitting several products counts once); product
-- counts are count(distinct p.id) because the model_products join fans out.
-- The "product has a published part" predicate is expressed as
-- `filter (where m.id is not null)` on the existing left joins so the target
-- rows survive, and as `having` / `exists` where a row must disappear.
--
-- Subtree membership is a starts_with() literal prefix check on
-- categories.path (paths end with a trailing slash, so /cook/ never matches
-- /cooker/).
--
-- SECURITY INVOKER throughout: brands, categories, products, model_products
-- and models are covered by the public read RLS policies, and the joins
-- filter on models.status = 'published' explicitly so counts are identical
-- for anonymous and authenticated readers.
--
-- Index note: search_all and the /brands listings now filter on
-- products.parts_count > 0. A partial index would keep that cheap as the
-- catalog grows:
--   create index products_with_parts_idx on public.products (brand_id)
--     where parts_count > 0;
-- Not created here — the human decides on indexes.
--
-- Applied to production on 2026-09-22 via the Supabase MCP at the human's
-- explicit instruction (recorded as version 20260922120000).

-- ============================================================================
-- /browse hub
-- ============================================================================

create or replace function public.fetch_browse_nav()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with brand_totals as (
    -- Per-brand distinct published-part count and the distinct products that
    -- carry at least one of them. Brands whose products all lack parts get no
    -- row here and therefore no entry in the hub.
    select
      p.brand_id,
      count(distinct p.id)::int as product_count,
      count(distinct m.id)::int as parts_count
    from public.products p
    join public.model_products mp on mp.product_id = p.id
    join public.models m on m.id = mp.model_id and m.status = 'published'
    where p.brand_id is not null
    group by p.brand_id
  ),
  roots as (
    select c.id, c.name, c.slug, c.path
    from public.categories c
    where c.level = 0
  ),
  -- Subtree totals per root, restricted to products with published parts:
  -- a root whose whole subtree has nothing printable yields no row and is
  -- left off the hub.
  root_totals as (
    select
      r.id,
      count(distinct p.id)::int as product_count,
      count(distinct m.id)::int as parts_count
    from roots r
    join public.categories sub on starts_with(sub.path, r.path)
    join public.products p on p.category_id = sub.id
    join public.model_products mp on mp.product_id = p.id
    join public.models m on m.id = mp.model_id and m.status = 'published'
    group by r.id
  ),
  direct_totals as (
    select
      p.category_id,
      count(distinct p.id)::int as product_count,
      count(distinct m.id)::int as parts_count
    from public.products p
    join public.model_products mp on mp.product_id = p.id
    join public.models m on m.id = mp.model_id and m.status = 'published'
    where p.category_id is not null
    group by p.category_id
  ),
  -- Up to three example leaves per root, most parts first — and only leaves
  -- that actually have parts, so the tile microcopy never advertises an
  -- empty branch.
  root_examples as (
    select r.id as root_id, jsonb_agg(ex.name order by ex.rn) as example_leaves
    from roots r
    join lateral (
      select leaf.name,
             row_number() over (
               order by dt.parts_count desc, dt.product_count desc, leaf.name
             ) as rn
      from public.categories leaf
      join direct_totals dt on dt.category_id = leaf.id
      where starts_with(leaf.path, r.path)
        and leaf.id <> r.id
        and not exists (
          select 1 from public.categories ch where ch.parent_id = leaf.id
        )
      order by dt.parts_count desc, dt.product_count desc, leaf.name
      limit 3
    ) ex on true
    group by r.id
  )
  select jsonb_build_object(
    'brands', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'name', b.name,
          'slug', b.slug,
          'parts_count', bt.parts_count,
          'product_count', bt.product_count
        )
        order by b.name
      )
      from public.brands b
      join brand_totals bt on bt.brand_id = b.id
    ), '[]'::jsonb),
    'roots', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'name', r.name,
          'slug', r.slug,
          'parts_count', rt.parts_count,
          'product_count', rt.product_count,
          'example_leaves', coalesce(re.example_leaves, '[]'::jsonb)
        )
        order by r.name
      )
      from roots r
      join root_totals rt on rt.id = r.id
      left join root_examples re on re.root_id = r.id
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.fetch_browse_nav() to anon, authenticated;

-- ============================================================================
-- Category page aggregates
-- ============================================================================

create or replace function public.fetch_category_page(p_slug text)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with target as (
    select id, name, slug, path, level
    from public.categories
    where slug = p_slug
  ),
  -- Subtree totals for the target and each of its direct children. The left
  -- joins keep the target row alive at zero (its page still renders); the
  -- product count only counts products that carry a published part.
  subtree as (
    select
      c.id,
      count(distinct p.id) filter (where m.id is not null)::int as product_count,
      count(distinct m.id)::int as parts_count
    from public.categories c
    join public.categories sub on starts_with(sub.path, c.path)
    left join public.products p on p.category_id = sub.id
    left join public.model_products mp on mp.product_id = p.id
    left join public.models m on m.id = mp.model_id and m.status = 'published'
    where c.id = (select id from target)
       or c.parent_id = (select id from target)
    group by c.id
  ),
  -- Brands of the target's *direct* products that have published parts: the
  -- chips link to /brands/[brand]/[category], which lists exactly those.
  covering_brands as (
    select
      b.id,
      b.name,
      b.slug,
      count(distinct p.id)::int as product_count,
      count(distinct m.id)::int as parts_count
    from public.products p
    join public.brands b on b.id = p.brand_id
    join public.model_products mp on mp.product_id = p.id
    join public.models m on m.id = mp.model_id and m.status = 'published'
    where p.category_id = (select id from target)
    group by b.id, b.name, b.slug
  )
  select case when exists (select 1 from target) then jsonb_build_object(
    'category', (
      select jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'slug', t.slug,
        'level', t.level,
        'parts_count', s.parts_count,
        'product_count', s.product_count
      )
      from target t
      join subtree s on s.id = t.id
    ),
    'ancestors', coalesce((
      select jsonb_agg(
        jsonb_build_object('name', a.name, 'slug', a.slug)
        order by a.level
      )
      from public.categories a, target t
      where starts_with(t.path, a.path)
        and a.id <> t.id
    ), '[]'::jsonb),
    -- Children with nothing printable in their subtree are not navigable.
    -- children_count follows the same rule so the "N subcategories" hint on a
    -- tile never promises more branches than the next page will show.
    'children', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'slug', c.slug,
          'parts_count', s.parts_count,
          'product_count', s.product_count,
          'children_count', (
            select count(*)::int
            from public.categories g
            where g.parent_id = c.id
              and exists (
                select 1
                from public.categories sub
                join public.products p on p.category_id = sub.id
                join public.model_products mp on mp.product_id = p.id
                join public.models m on m.id = mp.model_id and m.status = 'published'
                where starts_with(sub.path, g.path)
              )
          )
        )
        order by c.name
      )
      from public.categories c
      join subtree s on s.id = c.id
      where c.parent_id = (select id from target)
        and s.parts_count > 0
    ), '[]'::jsonb),
    'brands', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', cb.id,
          'name', cb.name,
          'slug', cb.slug,
          'parts_count', cb.parts_count,
          'product_count', cb.product_count
        )
        order by cb.name
      )
      from covering_brands cb
    ), '[]'::jsonb)
  ) end;
$$;

grant execute on function public.fetch_category_page(text) to anon, authenticated;

-- ============================================================================
-- Brand page aggregates
-- ============================================================================

create or replace function public.fetch_brand_nav(p_brand_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with product_parts as (
    -- One row per (product, published part) pair of this brand. Products
    -- without parts keep a row with a null model only so the CTE stays a
    -- complete inventory; the aggregates below ignore them.
    select p.id as product_id, p.category_id, m.id as model_id
    from public.products p
    left join public.model_products mp on mp.product_id = p.id
    left join public.models m on m.id = mp.model_id and m.status = 'published'
    where p.brand_id = p_brand_id
  ),
  totals as (
    select
      count(distinct product_id) filter (where model_id is not null)::int as product_count,
      count(distinct model_id)::int as parts_count
    from product_parts
  ),
  -- Categories covered by products that have parts; a category whose
  -- products of this brand are all empty gets no chip. Products without a
  -- category cannot appear in the navigation either way.
  covered_categories as (
    select
      c.id,
      c.name,
      c.slug,
      count(distinct pp.product_id)::int as product_count,
      count(distinct pp.model_id)::int as parts_count
    from product_parts pp
    join public.categories c on c.id = pp.category_id
    where pp.model_id is not null
    group by c.id, c.name, c.slug
  )
  select jsonb_build_object(
    'parts_count', (select parts_count from totals),
    'product_count', (select product_count from totals),
    'categories', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', id,
          'name', name,
          'slug', slug,
          'parts_count', parts_count,
          'product_count', product_count
        )
        order by name
      )
      from covered_categories
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.fetch_brand_nav(uuid) to anon, authenticated;

-- ============================================================================
-- Search
-- ============================================================================

-- Same function as 20260802141500 with two changes: product_docs only
-- indexes products with a published part (parts_count is the
-- trigger-maintained count of distinct published models, see #227), and
-- brand_hits only considers brands with at least one such product, with
-- product_count counting those products only. The models group is untouched —
-- it is already published-only.

create or replace function public.search_all(
  search_query text,
  result_limit integer default 5
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $func$
  with params as (
    select
      btrim(coalesce(search_query, '')) as raw,
      least(greatest(coalesce(result_limit, 5), 1), 20) as lim
  ),
  query as (
    select p.raw, p.lim, websearch_to_tsquery('english', p.raw) as tsq
    from params p
  ),
  -- Products: name + brand name; carries the category name and the denormalized
  -- parts_count for display. Products without a published part are not
  -- searchable (issue #312).
  product_docs as (
    select
      pr.id, pr.name, pr.slug, pr.image_url,
      pr.parts_count, c.name as category,
      concat_ws(' ', pr.name, b.name) as doc
    from public.products pr
    left join public.brands b on b.id = pr.brand_id
    left join public.categories c on c.id = pr.category_id
    where pr.parts_count > 0
  ),
  product_hits as (
    select
      d.id, d.name, d.slug, d.image_url, d.category, d.parts_count,
      ts_rank(to_tsvector('english', d.doc), q.tsq) * 4
        + word_similarity(q.raw, d.doc) as score
    from product_docs d, query q
    where q.raw <> ''
      and (
        to_tsvector('english', d.doc) @@ q.tsq
        or word_similarity(q.raw, d.doc) > 0.3
      )
    order by score desc
    limit (select lim from params)
  ),
  -- Models: own fields + linked product / brand names for matching; carries the
  -- part's own brand, one representative linked product name and the license
  -- short name for display. Published only.
  model_docs as (
    select
      m.id, m.name, m.slug, m.part_name, m.part_number, m.thumbnail_url,
      l.short_name as license,
      mb.name as brand_name,
      mb.slug as brand_slug,
      min(lp.name) as product_name,
      concat_ws(' ',
        m.name,
        m.part_name,
        m.part_number,
        array_to_string(m.tags, ' '),
        string_agg(distinct lp.name, ' '),
        string_agg(distinct lb.name, ' ')
      ) as doc
    from public.models m
    left join public.licenses l on l.id = m.license_id
    left join public.brands mb on mb.id = m.brand_id
    left join public.model_products mp on mp.model_id = m.id
    left join public.products lp on lp.id = mp.product_id
    left join public.brands lb on lb.id = lp.brand_id
    where m.status = 'published'
    group by m.id, l.short_name, mb.name, mb.slug
  ),
  model_hits as (
    select
      d.id, d.name, d.slug, d.part_name, d.part_number, d.thumbnail_url,
      d.license, d.product_name, d.brand_name, d.brand_slug,
      ts_rank(to_tsvector('english', d.doc), q.tsq) * 4
        + word_similarity(q.raw, d.doc) as score
    from model_docs d, query q
    where q.raw <> ''
      and (
        to_tsvector('english', d.doc) @@ q.tsq
        or word_similarity(q.raw, d.doc) > 0.3
      )
    order by score desc
    limit (select lim from params)
  ),
  -- Brands: name (+ description for full-text only), typo tolerance on name.
  -- Only brands with at least one product carrying a published part are
  -- searchable (issue #312).
  brand_hits as (
    select
      b.id, b.name, b.slug, b.logo_url,
      ts_rank(to_tsvector('english', concat_ws(' ', b.name, b.description)), q.tsq) * 4
        + word_similarity(q.raw, b.name) as score
    from public.brands b, query q
    where q.raw <> ''
      and exists (
        select 1 from public.products p
        where p.brand_id = b.id and p.parts_count > 0
      )
      and (
        to_tsvector('english', concat_ws(' ', b.name, b.description)) @@ q.tsq
        or word_similarity(q.raw, b.name) > 0.3
      )
    order by score desc
    limit (select lim from params)
  ),
  -- product_count is the number of products with parts, matching the hub.
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
        'parts_count', parts_count
      ) order by score desc)
      from product_hits
    ), '[]'::jsonb),
    'models', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'slug', slug,
        'part_name', part_name,
        'part_number', part_number,
        'thumbnail_url', thumbnail_url,
        'product_name', product_name,
        'license', license,
        'brand', case
          when brand_slug is not null
          then jsonb_build_object('name', brand_name, 'slug', brand_slug)
        end,
        'products', coalesce((
          select jsonb_agg(jsonb_build_object('name', pp.name, 'slug', pp.slug) order by pp.name)
          from (
            select p.name, p.slug
            from public.model_products mp
            join public.products p on p.id = mp.product_id
            where mp.model_id = model_hits.id
            order by p.name
            limit 2
          ) pp
        ), '[]'::jsonb),
        'product_count', (
          select count(*)::int
          from public.model_products mp
          where mp.model_id = model_hits.id
        )
      ) order by score desc)
      from model_hits
    ), '[]'::jsonb),
    'brands', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'slug', slug,
        'logo_url', logo_url,
        'product_count', product_count
      ) order by score desc)
      from brand_results
    ), '[]'::jsonb)
  );
$func$;

grant execute on function public.search_all(text, integer) to anon, authenticated;
