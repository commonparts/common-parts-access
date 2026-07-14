-- Migration: flatten the product model for MVP
--
-- Removes three pieces of structure that the MVP does not use (verified empty in
-- production on 2026-07-14: 0 families, 0 variants, 0 populated model_number,
-- 0 verified links, 0 models carrying the legacy product_id):
--   1. models.product_id            — legacy single-FK, superseded by model_products
--   2. products family hierarchy    — parent_id, product_kind + their constraints
--   3. products.model_number        — the manufacturer reference attribute
--   4. model_products.compatibility_status — the declared/verified distinction
--
-- A model links to one or more flat products through model_products only. The
-- parts_count trigger set and the search_all RPC are recreated without any
-- family/variant/model_number logic so they keep working after the columns go.
--
-- Idempotent-safe where practical. To be validated and executed by a human via
-- the Supabase SQL editor — never applied by the agent.

-- ============================================================================
-- 1. Recreate functions that reference the columns being dropped, BEFORE the
--    drops, so their stored bodies no longer name those columns.
-- ============================================================================

-- parts_count recompute: distinct published models linked directly to the
-- product. No family aggregation now that variants are gone.
create or replace function public.recompute_product_parts_count(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_product_id is null then
    return;
  end if;

  update public.products p
  set parts_count = (
    select count(distinct mp.model_id)
    from public.model_products mp
    join public.models m on m.id = mp.model_id and m.status = 'published'
    where mp.product_id = p.id
  )
  where p.id = p_product_id;
end;
$$;

-- model_products insert/delete: recompute the single linked product.
create or replace function public.trg_model_products_parts_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_product uuid;
begin
  if tg_op = 'DELETE' then
    affected_product := old.product_id;
  else
    affected_product := new.product_id;
  end if;

  perform public.recompute_product_parts_count(affected_product);
  return null;
end;
$$;

-- model status change: recompute every product the model is linked to.
create or replace function public.trg_models_status_parts_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec record;
begin
  for rec in
    select distinct mp.product_id
    from public.model_products mp
    where mp.model_id = new.id
  loop
    perform public.recompute_product_parts_count(rec.product_id);
  end loop;

  return null;
end;
$$;

-- search_all: same display fields as issue #228, minus every family/reference
-- concept. Products match on name + brand (no model_number, no parent family);
-- models drop the parent-family join. category, parts_count, product_name,
-- author_username, license and brand product_count are all preserved.
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
  -- parts_count (trigger-maintained by #227) for display.
  product_docs as (
    select
      pr.id, pr.name, pr.slug, pr.image_url,
      pr.parts_count, c.name as category,
      concat_ws(' ', pr.name, b.name) as doc
    from public.products pr
    left join public.brands b on b.id = pr.brand_id
    left join public.categories c on c.id = pr.category_id
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
  -- Models: own fields + linked product / brand names for matching; carries one
  -- representative linked product name, author username and license short name
  -- for display. Published only.
  model_docs as (
    select
      m.id, m.name, m.slug, m.part_name, m.part_number, m.thumbnail_url,
      up.username as author_username,
      l.short_name as license,
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
    left join public.user_profiles up on up.id = m.user_id
    left join public.licenses l on l.id = m.license_id
    left join public.model_products mp on mp.model_id = m.id
    left join public.products lp on lp.id = mp.product_id
    left join public.brands lb on lb.id = lp.brand_id
    where m.status = 'published'
    group by m.id, up.username, l.short_name
  ),
  model_hits as (
    select
      d.id, d.name, d.slug, d.part_name, d.part_number, d.thumbnail_url,
      d.author_username, d.license, d.product_name,
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
  -- Brands: name (+ description for full-text only), typo tolerance on name;
  -- carries the count of products under the brand for display.
  brand_hits as (
    select
      b.id, b.name, b.slug, b.logo_url,
      ts_rank(to_tsvector('english', concat_ws(' ', b.name, b.description)), q.tsq) * 4
        + word_similarity(q.raw, b.name) as score
    from public.brands b, query q
    where q.raw <> ''
      and (
        to_tsvector('english', concat_ws(' ', b.name, b.description)) @@ q.tsq
        or word_similarity(q.raw, b.name) > 0.3
      )
    order by score desc
    limit (select lim from params)
  ),
  brand_results as (
    select
      h.id, h.name, h.slug, h.logo_url, h.score,
      coalesce(pc.product_count, 0) as product_count
    from brand_hits h
    left join (
      select p.brand_id, count(*)::int as product_count
      from public.products p
      where p.brand_id in (select id from brand_hits)
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
        'author_username', author_username,
        'license', license
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

-- ============================================================================
-- 2. Drop model_products.compatibility_status (declared/verified distinction).
-- ============================================================================

alter table public.model_products
  drop constraint if exists model_products_compatibility_status_check;

alter table public.model_products
  drop column if exists compatibility_status;

-- ============================================================================
-- 3. Drop the products family hierarchy and model_number.
-- ============================================================================

drop index if exists public.idx_products_parent;

alter table public.products
  drop constraint if exists products_kind_parent_consistency;

alter table public.products
  drop constraint if exists products_product_kind_check;

alter table public.products
  drop column if exists parent_id;

alter table public.products
  drop column if exists product_kind;

alter table public.products
  drop column if exists model_number;

-- ============================================================================
-- 4. Drop the legacy single-FK on models (superseded by model_products).
-- ============================================================================

alter table public.models
  drop column if exists product_id;
