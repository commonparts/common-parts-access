-- Migration: derive a part's brands from its compatible products (issue #315)
--
-- `parts.brand_id` recorded a single brand per part. That contradicts
-- `part_products`, which already links a part to products of several brands:
-- one dishwasher wheel fits Bosch, Siemens and Neff machines. A part's brands
-- are therefore a derived set -- the distinct brands of the products it fits --
-- never a column of its own.
--
-- What this migration does, in order:
--
--   1. Drops `parts.brand_id`, together with the `parts_brand_id_fkey`
--      foreign key and the `idx_parts_brand` index that postgres removes with
--      the column. No backfill is needed: every part carrying a brand is
--      already linked to at least one product of that same brand, so the
--      derived set reproduces the column exactly (verified against production
--      before writing this migration).
--   2. Adds `idx_part_products_product` on `part_products(product_id)`. The
--      composite primary key `(part_id, product_id)` cannot serve a lookup
--      keyed on the product alone, and every brand-derived read added by this
--      issue -- the brand filter on /browse, the brand set on a part card,
--      the brand list in search_all -- traverses the junction in that
--      direction.
--   3. Recreates `search_all` so a part hit carries the `brands` array of its
--      linked products' brands instead of the `brand` object taken from the
--      dropped column. The matching document is unchanged: it already folded
--      the linked products' brand names in, which is exactly the set now
--      returned.
--
-- The other three RPCs (fetch_browse_nav, fetch_category_page,
-- fetch_brand_nav) are untouched: they already reach brands through
-- `products.brand_id`, never through the part.
--
-- `products.brand_id` stays -- a product does belong to exactly one brand.

-- 1. Drop the column, its foreign key and its index.
alter table public.parts drop column brand_id;

-- 2. Index the junction in the product -> part direction.
create index if not exists idx_part_products_product
  on public.part_products (product_id);

-- 3. search_all: a part's brands now come from its linked products.
create or replace function public.search_all(
  search_query text,
  result_limit integer default 5
)
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
  -- Parts: own fields + linked product / brand names for matching; carries one
  -- representative linked product name and the license short name for display.
  -- The part's own brand column is gone (issue #315) -- the brands it is filed
  -- under are the distinct brands of the products it fits, emitted below.
  -- Published only.
  part_docs as (
    select
      pt.id, pt.name, pt.slug, pt.part_name, pt.part_number, pt.thumbnail_url,
      l.short_name as license,
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
    left join public.part_products mp on mp.part_id = pt.id
    left join public.products lp on lp.id = mp.product_id
    left join public.brands lb on lb.id = lp.brand_id
    where pt.status = 'published'
    group by pt.id, l.short_name
  ),
  part_hits as (
    select
      d.id, d.name, d.slug, d.part_name, d.part_number, d.thumbnail_url,
      d.license, d.product_name,
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
        -- Every distinct brand behind the part's linked products, ordered by
        -- name -- the card's eyebrow lists them in that order. Unlike
        -- `products` below this is not truncated: the brand set is what files
        -- the part in the navigation, so a partial list would misattribute it.
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
$function$;
