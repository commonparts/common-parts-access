-- Migration: multi-entity search function (issue #226)
--
-- Provides GET /api/search's data source: a single RPC that returns grouped
-- results (products, models, brands) with typo tolerance.
--
-- Design note — no stored index yet (deliberate):
-- The searchable text for a model combines its own fields with denormalized
-- content from linked products, the parent family (products.parent_id) and the
-- brand. Rather than persist that as a trigger-maintained tsvector column, we
-- build it on the fly per row inside this function. At the current scale
-- (hundreds to low thousands of models) an on-the-fly scan is a few
-- milliseconds — well within the 150 ms autocomplete budget — and it removes an
-- entire class of silent-staleness bugs (a brand rename or parent_id change is
-- reflected immediately, with no synchronization code to get wrong).
--
-- Planned evolution: once the model count reaches tens of thousands, replace the
-- on-the-fly text with a trigger-maintained STORED tsvector column plus a GIN
-- index, behind this exact same function signature and JSON contract. Callers do
-- not change.
--
-- pg_trgm is already enabled (see initial schema); word_similarity gives the
-- one-character-typo tolerance that full-text search alone cannot.

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
    -- Clamp the per-group limit to [1, 20]; empty/whitespace queries collapse
    -- to '' and every group below short-circuits to an empty array.
    select
      btrim(coalesce(search_query, '')) as raw,
      least(greatest(coalesce(result_limit, 5), 1), 20) as lim
  ),
  query as (
    select
      p.raw,
      p.lim,
      websearch_to_tsquery('english', p.raw) as tsq
    from params p
  ),
  -- Products: name + model number + parent family name + brand name.
  product_docs as (
    select
      pr.id, pr.name, pr.slug, pr.model_number, pr.product_kind, pr.image_url,
      concat_ws(' ', pr.name, pr.model_number, fam.name, b.name) as doc
    from public.products pr
    left join public.products fam on fam.id = pr.parent_id
    left join public.brands b on b.id = pr.brand_id
  ),
  product_hits as (
    select
      d.id, d.name, d.slug, d.model_number, d.product_kind, d.image_url,
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
      h.id, h.name, h.slug, h.model_number, h.product_kind, h.image_url, h.score,
      -- Parts linked to the product itself or, when it is a family, to any of
      -- its variants — mirrors fetchFamilyParts (issue #225). Published only.
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
  -- Models: own fields + linked product / family / brand names, aggregated
  -- across every product the model is linked to. Published only.
  model_docs as (
    select
      m.id, m.name, m.slug, m.part_name, m.part_number, m.thumbnail_url,
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
    left join public.model_products mp on mp.model_id = m.id
    left join public.products lp on lp.id = mp.product_id
    left join public.products lfam on lfam.id = lp.parent_id
    left join public.brands lb on lb.id = lp.brand_id
    where m.status = 'published'
    group by m.id
  ),
  model_hits as (
    select
      d.id, d.name, d.slug, d.part_name, d.part_number, d.thumbnail_url,
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
        'thumbnail_url', thumbnail_url
      ) order by score desc)
      from model_hits
    ), '[]'::jsonb),
    'brands', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'slug', slug,
        'logo_url', logo_url
      ) order by score desc)
      from brand_hits
    ), '[]'::jsonb)
  );
$func$;

-- Callable by anonymous and authenticated visitors; RLS still applies because
-- the function is SECURITY INVOKER (only published models are ever returned).
grant execute on function public.search_all(text, integer) to anon, authenticated;
