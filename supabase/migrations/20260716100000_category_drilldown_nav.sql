-- Migration: hierarchical category drill-down navigation (issue #276)
--
-- Reworks fetch_browse_nav so the /browse hub shows the level-0 roots with
-- subtree-aggregated counts (plus example leaves as microcopy), and adds
-- fetch_category_page powering the new /categories/[slug] routes. All counts
-- are path-prefix sums of the denormalized products.parts_count
-- (trigger-maintained since #227/#244) — no per-row count queries.
--
-- The LIKE prefix match on categories.path is safe against sibling-prefix
-- collisions (/cook/ vs /cooker/) because materialized paths always end with
-- a trailing slash; slugs cannot contain the LIKE wildcards % or _.
--
-- SECURITY INVOKER: everything read here (brands, categories, products) is
-- covered by the public read RLS policies, so no privilege escalation is
-- needed or wanted.
--
-- To be applied by the human via the Supabase SQL editor (see PR for #276).

create or replace function public.fetch_browse_nav()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with brand_totals as (
    -- Per-brand product count and summed published-parts count.
    select
      p.brand_id,
      count(*)::int as product_count,
      sum(p.parts_count)::int as parts_count
    from public.products p
    where p.brand_id is not null
    group by p.brand_id
  ),
  roots as (
    select c.id, c.name, c.slug, c.path
    from public.categories c
    where c.level = 0
  ),
  -- Subtree totals per root: every product attached anywhere under the root
  -- counts toward its tile, so availability is visible before drilling down.
  root_totals as (
    select
      r.id,
      count(p.id)::int as product_count,
      coalesce(sum(p.parts_count), 0)::int as parts_count
    from roots r
    join public.categories sub on sub.path like r.path || '%'
    left join public.products p on p.category_id = sub.id
    group by r.id
  ),
  direct_totals as (
    select
      category_id,
      count(*)::int as product_count,
      coalesce(sum(parts_count), 0)::int as parts_count
    from public.products
    where category_id is not null
    group by category_id
  ),
  -- Up to three example leaves per root, availability first: the hub tile
  -- microcopy previews where the catalog actually has content, not the
  -- alphabet. A leaf root (no descendants) simply gets no examples.
  root_examples as (
    select r.id as root_id, jsonb_agg(ex.name order by ex.rn) as example_leaves
    from roots r
    join lateral (
      select leaf.name,
             row_number() over (
               order by coalesce(dt.parts_count, 0) desc,
                        coalesce(dt.product_count, 0) desc,
                        leaf.name
             ) as rn
      from public.categories leaf
      left join direct_totals dt on dt.category_id = leaf.id
      where leaf.path like r.path || '%'
        and leaf.id <> r.id
        and not exists (
          select 1 from public.categories ch where ch.parent_id = leaf.id
        )
      order by coalesce(dt.parts_count, 0) desc,
               coalesce(dt.product_count, 0) desc,
               leaf.name
      limit 3
    ) ex on true
    group by r.id
  )
  select jsonb_build_object(
    -- Every brand in the index appears, including brands whose parts count
    -- dropped to zero: their page is kept alive ("No parts currently
    -- available") per Flow P2, so the hub keeps linking to it.
    'brands', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'name', b.name,
          'slug', b.slug,
          'parts_count', coalesce(bt.parts_count, 0),
          'product_count', coalesce(bt.product_count, 0)
        )
        order by b.name
      )
      from public.brands b
      left join brand_totals bt on bt.brand_id = b.id
    ), '[]'::jsonb),
    -- Zero-count roots are returned too — the hub mutes them, never hides
    -- them (P-3, status honesty).
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

-- Everything one /categories/[slug] page needs in a single round-trip: the
-- category with its subtree totals, the ancestor chain (breadcrumb, derived
-- from the materialized path), the direct children with their own subtree
-- totals, and the brands covering the category's direct products. Returns
-- NULL for an unknown slug (the route 404s).
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
  -- Subtree totals for the target and each of its direct children: path-prefix
  -- sums of the denormalized products.parts_count.
  subtree as (
    select
      c.id,
      count(p.id)::int as product_count,
      coalesce(sum(p.parts_count), 0)::int as parts_count
    from public.categories c
    join public.categories sub on sub.path like c.path || '%'
    left join public.products p on p.category_id = sub.id
    where c.id = (select id from target)
       or c.parent_id = (select id from target)
    group by c.id
  ),
  -- Brands of the target's *direct* products only: the chips link to
  -- /brands/[brand]/[category], which filters on the exact category id — a
  -- subtree-wide brand list would link to pages missing most of its products.
  covering_brands as (
    select
      b.id,
      b.name,
      b.slug,
      count(*)::int as product_count,
      sum(p.parts_count)::int as parts_count
    from public.products p
    join public.brands b on b.id = p.brand_id
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
      where t.path like a.path || '%'
        and a.id <> t.id
    ), '[]'::jsonb),
    'children', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'slug', c.slug,
          'parts_count', s.parts_count,
          'product_count', s.product_count,
          'children_count', (
            select count(*)::int from public.categories g where g.parent_id = c.id
          )
        )
        order by c.name
      )
      from public.categories c
      join subtree s on s.id = c.id
      where c.parent_id = (select id from target)
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
