-- Migration: rename models to parts across the schema (issue #314)
--
-- The entity stored in `models` is a spare part. The project strategy calls
-- it "part" everywhere else (public URLs live at /parts/[slug] since #258,
-- products carry a `parts_count`, requests live in `part_requests`), so the
-- schema now follows: every `model*` table, column, constraint, index,
-- trigger, function and policy is renamed to its `part*` equivalent.
--
-- What this migration does, in order:
--
--   1. Tables:   models -> parts, model_products -> part_products,
--                model_files -> part_files, model_views -> part_views,
--                model_downloads -> part_downloads,
--                model_comments -> part_comments, model_likes -> part_likes,
--                collection_models -> collection_parts.
--   2. Columns:  every `model_id` foreign key -> `part_id`, and
--                part_requests.fulfilled_by_model_id -> fulfilled_by_part_id.
--   3. Constraints, indexes and triggers: renamed so the catalog carries no
--      stale name. Their definitions are bound by OID and survive the table
--      renames unchanged.
--   4. RLS policies: renamed for the same reason. Policy expressions are
--      stored as parsed trees, so the `models` references inside them already
--      resolve to `parts` after step 1 -- nothing to recreate.
--   5. Functions: plpgsql / SQL bodies are stored as text and would break at
--      runtime, so every function whose body names an old table is recreated:
--      the counter trigger functions (renamed *_part_*), the parts-count
--      helpers, and the four public RPCs (fetch_browse_nav,
--      fetch_category_page, fetch_brand_nav, search_all -- same logic as
--      20260922120000, tables renamed). The `models` key of the search_all
--      payload becomes `parts`.
--
-- Deliberately NOT renamed: the storage buckets `model-files` and
-- `model-thumbnails`. Their ids are embedded in every stored object URL
-- (parts.thumbnail_url, part_files.file_url); renaming them is a data
-- migration of its own and is tracked separately. Their RLS policies keep
-- their names too — see the note in step 4.
--
-- Index note: no new index is needed; every existing index is carried over
-- under its new name.
--
-- Applied to production on 2026-09-22 via the Supabase MCP at the human's
-- explicit instruction (recorded as version 20260922130000). Verified first by
-- running the whole script inside a transaction and rolling it back:
-- fetch_browse_nav returned a byte-identical payload, search_all's three result
-- groups were byte-identical (only the top-level `models` key became `parts`),
-- and row counts were unchanged (16 parts, 65 files, 48 links, 115 views).

-- ============================================================================
-- 1. Tables
-- ============================================================================

alter table public.models rename to parts;
alter table public.model_products rename to part_products;
alter table public.model_files rename to part_files;
alter table public.model_views rename to part_views;
alter table public.model_downloads rename to part_downloads;
alter table public.model_comments rename to part_comments;
alter table public.model_likes rename to part_likes;
alter table public.collection_models rename to collection_parts;

-- ============================================================================
-- 2. Columns
-- ============================================================================

alter table public.part_products rename column model_id to part_id;
alter table public.part_files rename column model_id to part_id;
alter table public.part_views rename column model_id to part_id;
alter table public.part_downloads rename column model_id to part_id;
alter table public.part_comments rename column model_id to part_id;
alter table public.part_likes rename column model_id to part_id;
alter table public.collection_parts rename column model_id to part_id;
alter table public.part_requests rename column fulfilled_by_model_id to fulfilled_by_part_id;

-- ============================================================================
-- 3a. Constraints (renaming a pkey / unique constraint renames its index too)
-- ============================================================================

alter table public.parts rename constraint models_pkey to parts_pkey;
alter table public.parts rename constraint models_slug_key to parts_slug_key;
alter table public.parts rename constraint models_brand_id_fkey to parts_brand_id_fkey;
alter table public.parts rename constraint models_category_id_fkey to parts_category_id_fkey;
alter table public.parts rename constraint models_license_id_fkey to parts_license_id_fkey;
alter table public.parts rename constraint models_source_license_id_fkey to parts_source_license_id_fkey;
alter table public.parts rename constraint models_source_platform_fkey to parts_source_platform_fkey;
alter table public.parts rename constraint models_user_id_fkey to parts_user_id_fkey;
alter table public.parts rename constraint models_color_check to parts_color_check;
alter table public.parts rename constraint models_file_hosting_type_check to parts_file_hosting_type_check;
alter table public.parts rename constraint models_legal_review_justification_length to parts_legal_review_justification_length;
alter table public.parts rename constraint models_legal_review_requires_justification to parts_legal_review_requires_justification;
alter table public.parts rename constraint models_material_check to parts_material_check;
alter table public.parts rename constraint models_name_check to parts_name_check;
alter table public.parts rename constraint models_origin_type_check to parts_origin_type_check;
alter table public.parts rename constraint models_originality_attested_requires_timestamp to parts_originality_attested_requires_timestamp;
alter table public.parts rename constraint models_part_name_check to parts_part_name_check;
alter table public.parts rename constraint models_part_number_check to parts_part_number_check;
alter table public.parts rename constraint models_status_check to parts_status_check;
alter table public.parts rename constraint models_verification_status_check to parts_verification_status_check;

alter table public.part_products rename constraint model_products_pkey to part_products_pkey;
alter table public.part_products rename constraint model_products_model_id_fkey to part_products_part_id_fkey;
alter table public.part_products rename constraint model_products_product_id_fkey to part_products_product_id_fkey;

alter table public.part_files rename constraint model_files_pkey to part_files_pkey;
alter table public.part_files rename constraint model_files_model_id_fkey to part_files_part_id_fkey;
alter table public.part_files rename constraint model_files_checksum_check to part_files_checksum_check;
alter table public.part_files rename constraint model_files_file_category_check to part_files_file_category_check;
alter table public.part_files rename constraint model_files_file_type_check to part_files_file_type_check;
alter table public.part_files rename constraint model_files_filename_check to part_files_filename_check;
alter table public.part_files rename constraint model_files_original_filename_check to part_files_original_filename_check;

alter table public.part_views rename constraint model_views_pkey to part_views_pkey;
alter table public.part_views rename constraint model_views_model_id_fkey to part_views_part_id_fkey;
alter table public.part_views rename constraint model_views_user_id_fkey to part_views_user_id_fkey;
alter table public.part_views rename constraint model_views_ip_hash_check to part_views_ip_hash_check;
alter table public.part_views rename constraint model_views_user_agent_check to part_views_user_agent_check;

alter table public.part_downloads rename constraint model_downloads_pkey to part_downloads_pkey;
alter table public.part_downloads rename constraint model_downloads_model_id_fkey to part_downloads_part_id_fkey;
alter table public.part_downloads rename constraint model_downloads_file_id_fkey to part_downloads_file_id_fkey;
alter table public.part_downloads rename constraint model_downloads_user_id_fkey to part_downloads_user_id_fkey;
alter table public.part_downloads rename constraint model_downloads_ip_hash_check to part_downloads_ip_hash_check;
alter table public.part_downloads rename constraint model_downloads_user_agent_check to part_downloads_user_agent_check;

alter table public.part_comments rename constraint model_comments_pkey to part_comments_pkey;
alter table public.part_comments rename constraint model_comments_model_id_fkey to part_comments_part_id_fkey;
alter table public.part_comments rename constraint model_comments_parent_id_fkey to part_comments_parent_id_fkey;
alter table public.part_comments rename constraint model_comments_user_id_fkey to part_comments_user_id_fkey;
alter table public.part_comments rename constraint model_comments_rating_check to part_comments_rating_check;

alter table public.part_likes rename constraint model_likes_pkey to part_likes_pkey;
alter table public.part_likes rename constraint model_likes_model_id_fkey to part_likes_part_id_fkey;
alter table public.part_likes rename constraint model_likes_user_id_fkey to part_likes_user_id_fkey;
alter table public.part_likes rename constraint model_likes_user_id_model_id_key to part_likes_user_id_part_id_key;

alter table public.collection_parts rename constraint collection_models_pkey to collection_parts_pkey;
alter table public.collection_parts rename constraint collection_models_model_id_fkey to collection_parts_part_id_fkey;
alter table public.collection_parts rename constraint collection_models_collection_id_fkey to collection_parts_collection_id_fkey;

alter table public.part_requests rename constraint part_requests_fulfilled_by_model_id_fkey to part_requests_fulfilled_by_part_id_fkey;

-- ============================================================================
-- 3b. Standalone indexes
-- ============================================================================

alter index public.idx_models_brand rename to idx_parts_brand;
alter index public.idx_models_category rename to idx_parts_category;
alter index public.idx_models_owner_origin_status rename to idx_parts_owner_origin_status;
alter index public.idx_models_search rename to idx_parts_search;
alter index public.idx_models_source_url rename to idx_parts_source_url;
alter index public.idx_models_status_created rename to idx_parts_status_created;
alter index public.idx_models_user rename to idx_parts_user;
alter index public.idx_published_models rename to idx_published_parts;
alter index public.models_name_idx rename to parts_name_idx;
alter index public.idx_model_files_model rename to idx_part_files_part;
alter index public.idx_model_downloads_recent rename to idx_part_downloads_recent;

-- ============================================================================
-- 3c. Triggers
-- ============================================================================

alter trigger models_status_parts_count on public.parts rename to parts_status_parts_count;
alter trigger model_products_parts_count on public.part_products rename to part_products_parts_count;
alter trigger model_views_increment on public.part_views rename to part_views_increment;
alter trigger model_downloads_increment on public.part_downloads rename to part_downloads_increment;
alter trigger model_likes_increment on public.part_likes rename to part_likes_increment;
alter trigger model_likes_decrement on public.part_likes rename to part_likes_decrement;

-- ============================================================================
-- 4. RLS policies (names only -- expressions already point at the new tables)
-- ============================================================================

alter policy "Anyone can view published models" on public.parts rename to "Anyone can view published parts";
alter policy "Users can manage own models" on public.parts rename to "Users can manage own parts";
alter policy "Users can view own models" on public.parts rename to "Users can view own parts";

alter policy "Users can manage files of own models" on public.part_files rename to "Users can manage files of own parts";
alter policy "Users can view files of accessible models" on public.part_files rename to "Users can view files of accessible parts";

alter policy "Service role can read model_views" on public.part_views rename to "Service role can read part_views";
alter policy "Service role can read model_downloads" on public.part_downloads rename to "Service role can read part_downloads";
alter policy "Service role can read model_likes" on public.part_likes rename to "Service role can read part_likes";

alter policy "Anyone can read comments on published models" on public.part_comments rename to "Anyone can read comments on published parts";
alter policy "Users can insert comments on published models" on public.part_comments rename to "Users can insert comments on published parts";

alter policy "Collection models are readable for public collections" on public.collection_parts rename to "Collection parts are readable for public collections";
alter policy "Users can manage own collection models" on public.collection_parts rename to "Users can manage own collection parts";

-- The two storage.objects policies that read `models` (now `parts`) keep their
-- names. Their expressions already resolve to `parts`, but the policy names
-- cannot be changed from a migration: storage.objects is owned by
-- supabase_storage_admin and `alter policy ... rename` requires table
-- ownership, which the migration role (postgres) does not have. That is
-- consistent anyway — those policies are named after their bucket, and the
-- buckets deliberately keep their `model-*` ids (see the header).

-- ============================================================================
-- 5a. Counter trigger functions
-- ============================================================================

create or replace function public.increment_part_view_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.parts
     set view_count = coalesce(view_count, 0) + 1
   where id = new.part_id;
  return new;
end;
$$;

create or replace function public.increment_part_download_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.parts
     set download_count = coalesce(download_count, 0) + 1
   where id = new.part_id;
  return new;
end;
$$;

create or replace function public.increment_part_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.parts
     set like_count = coalesce(like_count, 0) + 1
   where id = new.part_id;
  return new;
end;
$$;

create or replace function public.decrement_part_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.parts
     set like_count = greatest(coalesce(like_count, 0) - 1, 0)
   where id = old.part_id;
  return old;
end;
$$;

-- Rebind the counter triggers to the renamed functions, then drop the old ones.
drop trigger part_views_increment on public.part_views;
create trigger part_views_increment
  after insert on public.part_views
  for each row execute function public.increment_part_view_count();

drop trigger part_downloads_increment on public.part_downloads;
create trigger part_downloads_increment
  after insert on public.part_downloads
  for each row execute function public.increment_part_download_count();

drop trigger part_likes_increment on public.part_likes;
create trigger part_likes_increment
  after insert on public.part_likes
  for each row execute function public.increment_part_like_count();

drop trigger part_likes_decrement on public.part_likes;
create trigger part_likes_decrement
  after delete on public.part_likes
  for each row execute function public.decrement_part_like_count();

drop function public.increment_model_view_count();
drop function public.increment_model_download_count();
drop function public.increment_model_like_count();
drop function public.decrement_model_like_count();

-- ============================================================================
-- 5b. products.parts_count maintenance (see 20260708120740)
-- ============================================================================

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
    select count(distinct pp.part_id)
    from public.part_products pp
    join public.parts pt on pt.id = pp.part_id and pt.status = 'published'
    where pp.product_id = p.id
  )
  where p.id = p_product_id;
end;
$$;

create or replace function public.trg_part_products_parts_count()
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

create or replace function public.trg_parts_status_parts_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec record;
begin
  for rec in
    select distinct pp.product_id
    from public.part_products pp
    where pp.part_id = new.id
  loop
    perform public.recompute_product_parts_count(rec.product_id);
  end loop;

  return null;
end;
$$;

drop trigger part_products_parts_count on public.part_products;
create trigger part_products_parts_count
  after insert or delete on public.part_products
  for each row execute function public.trg_part_products_parts_count();

drop trigger parts_status_parts_count on public.parts;
create trigger parts_status_parts_count
  after update of status on public.parts
  for each row
  when (old.status is distinct from new.status)
  execute function public.trg_parts_status_parts_count();

drop function public.trg_model_products_parts_count();
drop function public.trg_models_status_parts_count();

-- 20260714000001 revoked the default PUBLIC execute on these SECURITY DEFINER
-- maintenance functions so anon/authenticated cannot invoke them directly
-- through PostgREST /rpc. The two trigger helpers above are new identities and
-- were granted that default again on creation, so revoke it once more.
-- recompute_product_parts_count kept its name, and `create or replace`
-- preserves privileges, so its revoked grant still stands.
revoke execute on function public.trg_part_products_parts_count() from public, anon, authenticated;
revoke execute on function public.trg_parts_status_parts_count() from public, anon, authenticated;

-- ============================================================================
-- 5c. Public RPCs -- same logic as 20260922120000 with the tables renamed
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
      count(distinct pt.id)::int as parts_count
    from public.products p
    join public.part_products mp on mp.product_id = p.id
    join public.parts pt on pt.id = mp.part_id and pt.status = 'published'
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
      count(distinct pt.id)::int as parts_count
    from roots r
    join public.categories sub on starts_with(sub.path, r.path)
    join public.products p on p.category_id = sub.id
    join public.part_products mp on mp.product_id = p.id
    join public.parts pt on pt.id = mp.part_id and pt.status = 'published'
    group by r.id
  ),
  direct_totals as (
    select
      p.category_id,
      count(distinct p.id)::int as product_count,
      count(distinct pt.id)::int as parts_count
    from public.products p
    join public.part_products mp on mp.product_id = p.id
    join public.parts pt on pt.id = mp.part_id and pt.status = 'published'
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
      count(distinct p.id) filter (where pt.id is not null)::int as product_count,
      count(distinct pt.id)::int as parts_count
    from public.categories c
    join public.categories sub on starts_with(sub.path, c.path)
    left join public.products p on p.category_id = sub.id
    left join public.part_products mp on mp.product_id = p.id
    left join public.parts pt on pt.id = mp.part_id and pt.status = 'published'
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
      count(distinct pt.id)::int as parts_count
    from public.products p
    join public.brands b on b.id = p.brand_id
    join public.part_products mp on mp.product_id = p.id
    join public.parts pt on pt.id = mp.part_id and pt.status = 'published'
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
                join public.part_products mp on mp.product_id = p.id
                join public.parts pt on pt.id = mp.part_id and pt.status = 'published'
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
    -- without parts keep a row with a null part only so the CTE stays a
    -- complete inventory; the aggregates below ignore them.
    select p.id as product_id, p.category_id, pt.id as part_id
    from public.products p
    left join public.part_products mp on mp.product_id = p.id
    left join public.parts pt on pt.id = mp.part_id and pt.status = 'published'
    where p.brand_id = p_brand_id
  ),
  totals as (
    select
      count(distinct product_id) filter (where part_id is not null)::int as product_count,
      count(distinct part_id)::int as parts_count
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
      count(distinct pp.part_id)::int as parts_count
    from product_parts pp
    join public.categories c on c.id = pp.category_id
    where pp.part_id is not null
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

-- Same function as 20260922120000, renamed tables and JSON key only: product_docs only
-- indexes products with a published part (parts_count is the
-- trigger-maintained count of distinct published parts, see #227), and
-- brand_hits only considers brands with at least one such product, with
-- product_count counting those products only. The parts group is untouched —
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
  -- Parts: own fields + linked product / brand names for matching; carries the
  -- part's own brand, one representative linked product name and the license
  -- short name for display. Published only.
  part_docs as (
    select
      pt.id, pt.name, pt.slug, pt.part_name, pt.part_number, pt.thumbnail_url,
      l.short_name as license,
      mb.name as brand_name,
      mb.slug as brand_slug,
      min(lp.name) as product_name,
      concat_ws(' ',
        pt.name,
        pt.part_name,
        pt.part_number,
        array_to_string(pt.tags, ' '),
        string_agg(distinct lp.name, ' '),
        string_agg(distinct lb.name, ' ')
      ) as doc
    from public.parts pt
    left join public.licenses l on l.id = pt.license_id
    left join public.brands mb on mb.id = pt.brand_id
    left join public.part_products mp on mp.part_id = pt.id
    left join public.products lp on lp.id = mp.product_id
    left join public.brands lb on lb.id = lp.brand_id
    where pt.status = 'published'
    group by pt.id, l.short_name, mb.name, mb.slug
  ),
  part_hits as (
    select
      d.id, d.name, d.slug, d.part_name, d.part_number, d.thumbnail_url,
      d.license, d.product_name, d.brand_name, d.brand_slug,
      ts_rank(to_tsvector('english', d.doc), q.tsq) * 4
        + word_similarity(q.raw, d.doc) as score
    from part_docs d, query q
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
        'brand', case
          when brand_slug is not null
          then jsonb_build_object('name', brand_name, 'slug', brand_slug)
        end,
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
      ) order by score desc)
      from part_hits
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
