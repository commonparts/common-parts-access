-- Migration: hierarchical category drill-down navigation (issue #276)
--
-- Reworks fetch_browse_nav so the /browse hub shows the level-0 roots with
-- subtree-aggregated counts (plus example leaves as microcopy), adds
-- fetch_category_page powering the new /categories/[slug] routes, and fixes
-- fetch_brand_nav's counting semantics (see below).
--
-- Parts counts are counts of DISTINCT published parts (model_products ×
-- published models), not sums of the denormalized products.parts_count:
-- a part that fits several products must count once per navigation node,
-- not once per product (found on PR #277 — iRobot showed "3 parts" for one
-- part linked to three products). products.parts_count stays correct for
-- per-product display; it is only the cross-product aggregation that must
-- deduplicate. Everything remains set-based single-round-trip aggregation —
-- no per-row count queries. Product counts are count(distinct p.id) because
-- the model_products join fans out product rows.
--
-- Subtree membership is a starts_with() literal prefix check on
-- categories.path — no LIKE wildcard semantics — and is safe against
-- sibling-prefix collisions (/cook/ vs /cooker/) because materialized paths
-- always end with a trailing slash.
--
-- SECURITY INVOKER: everything read here (brands, categories, products,
-- model_products, models) is covered by the public read RLS policies —
-- model_products rows are readable when their model is published, and the
-- joins filter on models.status = 'published' explicitly so counts are
-- identical for anonymous and authenticated readers.
--
-- Applied to production on 2026-07-16 via the Supabase MCP at the human's
-- explicit instruction (recorded as version 20260716181406).

create or replace function public.fetch_browse_nav()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with brand_totals as (
    -- Per-brand distinct product and distinct published-part counts.
    select
      p.brand_id,
      count(distinct p.id)::int as product_count,
      count(distinct m.id)::int as parts_count
    from public.products p
    left join public.model_products mp on mp.product_id = p.id
    left join public.models m on m.id = mp.model_id and m.status = 'published'
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
      count(distinct p.id)::int as product_count,
      count(distinct m.id)::int as parts_count
    from roots r
    join public.categories sub on starts_with(sub.path, r.path)
    left join public.products p on p.category_id = sub.id
    left join public.model_products mp on mp.product_id = p.id
    left join public.models m on m.id = mp.model_id and m.status = 'published'
    group by r.id
  ),
  direct_totals as (
    select
      p.category_id,
      count(distinct p.id)::int as product_count,
      count(distinct m.id)::int as parts_count
    from public.products p
    left join public.model_products mp on mp.product_id = p.id
    left join public.models m on m.id = mp.model_id and m.status = 'published'
    where p.category_id is not null
    group by p.category_id
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
      where starts_with(leaf.path, r.path)
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
  -- Subtree totals for the target and each of its direct children: distinct
  -- products and distinct published parts anywhere under the node.
  subtree as (
    select
      c.id,
      count(distinct p.id)::int as product_count,
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
  -- Brands of the target's *direct* products only: the chips link to
  -- /brands/[brand]/[category], which filters on the exact category id — a
  -- subtree-wide brand list would link to pages missing most of its products.
  covering_brands as (
    select
      b.id,
      b.name,
      b.slug,
      count(distinct p.id)::int as product_count,
      count(distinct m.id)::int as parts_count
    from public.products p
    join public.brands b on b.id = p.brand_id
    left join public.model_products mp on mp.product_id = p.id
    left join public.models m on m.id = mp.model_id and m.status = 'published'
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

-- ============================================================================
-- Brand page aggregates — same distinct-parts fix
-- ============================================================================

-- fetch_brand_nav (deployed by migration 20260715192445 for the /brands
-- pages of #256) has the same defect this migration fixes elsewhere: it sums
-- products.parts_count, so one part fitting three products displays as
-- "3 printable spare parts" on the brand page header and category chips.
-- Replaced here rather than in a separate migration so the hub and the brand
-- pages can never disagree about the same brand's numbers.
create or replace function public.fetch_brand_nav(p_brand_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with product_parts as (
    -- One row per (product, published part) pair of this brand; products
    -- without parts keep a row with a null model so they still count.
    select p.id as product_id, p.category_id, m.id as model_id
    from public.products p
    left join public.model_products mp on mp.product_id = p.id
    left join public.models m on m.id = mp.model_id and m.status = 'published'
    where p.brand_id = p_brand_id
  ),
  totals as (
    select
      count(distinct product_id)::int as product_count,
      count(distinct model_id)::int as parts_count
    from product_parts
  ),
  covered_categories as (
    -- Products without a category count toward the totals but cannot appear
    -- in the category navigation.
    select
      c.id,
      c.name,
      c.slug,
      count(distinct pp.product_id)::int as product_count,
      count(distinct pp.model_id)::int as parts_count
    from product_parts pp
    join public.categories c on c.id = pp.category_id
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
