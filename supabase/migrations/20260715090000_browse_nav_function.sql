-- Migration: browse navigation aggregates (issue #256)
--
-- One read-only RPC powering the /browse navigation hub: brands and
-- category×brand entries with parts_count sums. Counts reuse the denormalized
-- products.parts_count (trigger-maintained since #227/#244) — no per-row count
-- queries, per the search-flow batch decision.
--
-- SECURITY INVOKER: everything read here (brands, categories, products) is
-- covered by the public read RLS policies, so no privilege escalation is
-- needed or wanted.
--
-- To be validated and executed by the human via the Supabase SQL editor —
-- never applied by the agent.

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
  category_brand as (
    -- Per (category, brand) pair: the navigation targets of the hub's
    -- category section (/brands/[brand]/[category]).
    select
      p.category_id,
      p.brand_id,
      count(*)::int as product_count,
      sum(p.parts_count)::int as parts_count
    from public.products p
    where p.category_id is not null
      and p.brand_id is not null
    group by p.category_id, p.brand_id
  ),
  category_entries as (
    select
      c.id,
      c.name,
      c.slug,
      sum(cb.parts_count)::int as parts_count,
      jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'name', b.name,
          'slug', b.slug,
          'parts_count', cb.parts_count,
          'product_count', cb.product_count
        )
        order by b.name
      ) as brands
    from category_brand cb
    join public.categories c on c.id = cb.category_id
    join public.brands b on b.id = cb.brand_id
    group by c.id, c.name, c.slug
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
    'categories', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ce.id,
          'name', ce.name,
          'slug', ce.slug,
          'parts_count', ce.parts_count,
          'brands', ce.brands
        )
        order by ce.name
      )
      from category_entries ce
    ), '[]'::jsonb)
  );
$$;

grant execute on function public.fetch_browse_nav() to anon, authenticated;
