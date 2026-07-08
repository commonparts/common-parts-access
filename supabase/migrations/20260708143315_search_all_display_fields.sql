-- Migration: enrich search_all with autocomplete display fields (issue #228)
--
-- The grouped autocomplete rows need more than the minimal shape from #226:
--   products: + category (name)
--   models:   + product_name (a linked product, null => "Generic part"),
--             + author_username, + license (short name)
--   brands:   + product_count
--
-- Same matching / ranking / typo-tolerance and published-only rules as before;
-- this only adds display columns to each group's JSON. Built on the fly per row
-- (no stored index) exactly as documented in the original search_all migration.

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
  -- Products: name + model number + parent family name + brand name; carries
  -- the category name for display.
  product_docs as (
    select
      pr.id, pr.name, pr.slug, pr.model_number, pr.product_kind, pr.image_url,
      c.name as category,
      concat_ws(' ', pr.name, pr.model_number, fam.name, b.name) as doc
    from public.products pr
    left join public.products fam on fam.id = pr.parent_id
    left join public.brands b on b.id = pr.brand_id
    left join public.categories c on c.id = pr.category_id
  ),
  product_hits as (
    select
      d.id, d.name, d.slug, d.model_number, d.product_kind, d.image_url, d.category,
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
  product_results as (
    select
      h.id, h.name, h.slug, h.model_number, h.product_kind, h.image_url, h.category, h.score,
      (
        select count(distinct mp.model_id)
        from public.model_products mp
        join public.models m on m.id = mp.model_id and m.status = 'published'
        where mp.product_id = h.id
          or mp.product_id in (
            select v.id from public.products v where v.parent_id = h.id
          )
      ) as parts_count
    from product_hits h
  ),
  -- Models: own fields + linked product / family / brand names for matching;
  -- carries one representative linked product name, the author username and the
  -- license short name for display. Published only.
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
        string_agg(distinct lfam.name, ' '),
        string_agg(distinct lb.name, ' ')
      ) as doc
    from public.models m
    left join public.user_profiles up on up.id = m.user_id
    left join public.licenses l on l.id = m.license_id
    left join public.model_products mp on mp.model_id = m.id
    left join public.products lp on lp.id = mp.product_id
    left join public.products lfam on lfam.id = lp.parent_id
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
      (select count(*) from public.products p where p.brand_id = h.id) as product_count
    from brand_hits h
  )
  select jsonb_build_object(
    'products', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'slug', slug,
        'model_number', model_number,
        'product_kind', product_kind,
        'image_url', image_url,
        'category', category,
        'parts_count', parts_count
      ) order by score desc)
      from product_results
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
