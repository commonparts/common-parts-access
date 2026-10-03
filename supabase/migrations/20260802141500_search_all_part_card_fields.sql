-- Issue #211 — search results must render the same part card as /browse.
--
-- The card leads with the part's brand and the products it is mounted on.
-- search_all returned neither: only `product_name` (one representative name,
-- no slug, so it could not be linked) and `author_username`, which the card no
-- longer shows anywhere.
--
-- Adds to each models entry:
--   brand         {name, slug} of the part's own brand (models.brand_id), null
--                 when the part has none — matches what the browse card shows,
--                 which is the model's brand and not the linked product's.
--   products      up to 2 {name, slug} fits, ordered by name, for the card's
--                 "Fits …" line. Bounded here so the payload cannot grow with
--                 a part that fits 17 products.
--   product_count the untruncated number of linked products, which the card
--                 renders as "+N more".
--
-- Removes author_username: nothing consumes it since the card and the search
-- dropdown stopped showing the uploader, and it should not be shipped to the
-- browser for no reason.
--
-- `product_name` is kept — the search autocomplete dropdown still renders it as
-- its single secondary line.
--
-- The brand join is aggregated in model_docs (grouped per model), while the
-- product preview and count are correlated subqueries in the final projection
-- so they only run for the <= 20 rows that actually made the result set.
--
-- Still SECURITY INVOKER: RLS applies, model_docs filters to published models,
-- and products/brands are publicly readable.

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

-- Unchanged from the previous definition; restated because CREATE OR REPLACE
-- does not carry grants forward on a signature change and this keeps the
-- migration self-contained.
grant execute on function public.search_all(text, integer) to anon, authenticated;
