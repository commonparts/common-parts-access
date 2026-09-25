-- Migration: search by brand, commercial name and reference (issue #319)
--
-- People search with what they read on their device: a brand ("Kärcher"), a
-- commercial name ("K 3 Power Control") or a manufacturer reference
-- ("QP6520/20"). search_all only knew full-text and whole-query trigram
-- similarity, so "karcher k3" ranked every Kärcher product alike (the umlaut
-- and the "K 3" spacing never matched) and references were not searched.
--
-- What this migration does:
--
--   1. Adds `fold_search_text(text)`: lowercase with Latin accents removed, so
--      "Kärcher" and "karcher" compare equal. A `translate()` map rather than
--      the `unaccent` extension, so no new extension is installed; it covers
--      the Latin-1 letters found in brand and product names.
--   2. Adds `search_token_coverage(doc, tokens)`: the share of query tokens
--      found in a document. A token counts fully when its compact form (the
--      reference normalization: no spaces, dots, slashes or hyphens) appears in
--      the compact document, so "k3" matches "K 3"; otherwise it counts its
--      trigram word similarity when that reaches 0.5, which tolerates a typo
--      ("karchr"). Tokens are matched independently, so word order is free.
--   3. Replaces `search_all`:
--        - Products also match on `product_references.normalized_value` by
--          prefix, the query being normalized with
--          `normalize_product_reference()` exactly like stored references.
--          Prefix, because manufacturers append country or version suffixes
--          ("QP6520" finds QP6520/20 and QP6520/30). The prefix lookup uses
--          `idx_product_references_normalized_prefix` and only runs from 3
--          characters, below which a prefix matches too much to mean anything.
--          References of every region are searched; region never filters.
--        - Parts match through the references of the products they fit.
--        - Names are folded before full-text and trigram matching, and every
--          entity gains the token coverage in its score. Products and parts
--          also match when all tokens are found; brands match when the query
--          names them.
--        - Product results carry `reference`: the matched reference as
--          displayed, or null when the product matched by name.
--      Availability semantics from #312 are unchanged: only products with a
--      published part, brands with such a product, and published parts.
--
-- Scoring weights, per entity (higher first):
--   exact reference 8, reference prefix 6, token coverage x2, full-text rank
--   x4, trigram word similarity x1. A reference is the most specific thing a
--   user can type, so any reference hit outranks a name hit.

-- 1. Accent folding.
create or replace function public.fold_search_text(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(pg_catalog.translate(
    value,
    'ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÝýÿ',
    'AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOOooooooUUUUuuuuYyy'
  ))
$$;

comment on function public.fold_search_text(text) is
  'Lowercase with Latin accents removed, for accent-insensitive search matching.';

-- 2. Token coverage.
create or replace function public.search_token_coverage(doc text, tokens text[])
returns real
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(avg(
    case
      when pg_catalog.strpos(
             public.normalize_product_reference(public.fold_search_text(doc)),
             public.normalize_product_reference(t)
           ) > 0 then 1
      when public.word_similarity(t, public.fold_search_text(doc)) >= 0.5
        then public.word_similarity(t, public.fold_search_text(doc))
      else 0
    end
  ), 0)::real
  from pg_catalog.unnest(tokens) as t
  where public.normalize_product_reference(t) <> ''
$$;

comment on function public.search_token_coverage(text, text[]) is
  'Share of query tokens found in doc (1 = compact substring, else trigram word similarity >= 0.5), from 0 to 1.';

-- 3. search_all.
create or replace function public.search_all(search_query text, result_limit integer default 5)
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
    select
      p.raw,
      p.lim,
      fold_search_text(p.raw) as folded,
      websearch_to_tsquery('english', fold_search_text(p.raw)) as tsq,
      array(
        select t
        from unnest(regexp_split_to_array(fold_search_text(p.raw), '\s+')) as t
        where t <> ''
      ) as tokens,
      -- Same rule as stored references; LIKE wildcards escaped since `%` and
      -- `_` survive the normalization.
      replace(replace(replace(
        normalize_product_reference(p.raw), '\', '\\'), '%', '\%'), '_', '\_'
      ) as ref_pattern,
      normalize_product_reference(p.raw) as ref_value
    from params p
  ),
  -- Reference hits, one row per product: the best matching reference.
  ref_hits as (
    select distinct on (r.product_id)
      r.product_id,
      r.value as reference,
      case when r.normalized_value = q.ref_value then 8 else 6 end as ref_score
    from public.product_references r, query q
    where length(q.ref_value) >= 3
      and r.normalized_value like q.ref_pattern || '%'
    order by r.product_id, (r.normalized_value = q.ref_value) desc, length(r.normalized_value), r.value
  ),
  product_docs as (
    select
      pr.id, pr.name, pr.slug, pr.image_url,
      pr.parts_count, c.name as category,
      fold_search_text(concat_ws(' ', b.name, pr.name)) as doc,
      rh.reference, coalesce(rh.ref_score, 0) as ref_score
    from public.products pr
    left join public.brands b on b.id = pr.brand_id
    left join public.categories c on c.id = pr.category_id
    left join ref_hits rh on rh.product_id = pr.id
    where pr.parts_count > 0
  ),
  product_scored as (
    select
      d.*,
      search_token_coverage(d.doc, q.tokens) as coverage,
      to_tsvector('english', d.doc) @@ q.tsq as fts,
      ts_rank(to_tsvector('english', d.doc), q.tsq) as rank,
      word_similarity(q.folded, d.doc) as fuzzy
    from product_docs d, query q
    where q.raw <> ''
  ),
  product_hits as (
    select
      s.id, s.name, s.slug, s.image_url, s.category, s.parts_count, s.reference,
      s.ref_score + s.coverage * 2 + s.rank * 4 + s.fuzzy as score
    from product_scored s
    where s.ref_score > 0 or s.coverage >= 1 or s.fts or s.fuzzy > 0.3
    order by score desc, s.name
    limit (select lim from params)
  ),
  part_docs as (
    select
      pt.id, pt.name, pt.slug, pt.part_name, pt.part_number, pt.thumbnail_url,
      l.short_name as license,
      min(lp.name) as product_name,
      fold_search_text(concat_ws(' ',
        pt.name,
        pt.part_name,
        pt.part_number,
        array_to_string(pt.tags, ' '),
        string_agg(distinct lp.name, ' '),
        string_agg(distinct lb.name, ' ')
      )) as doc,
      coalesce(max(rh.ref_score), 0) as ref_score
    from public.parts pt
    left join public.licenses l on l.id = pt.license_id
    left join public.part_products mp on mp.part_id = pt.id
    left join public.products lp on lp.id = mp.product_id
    left join public.brands lb on lb.id = lp.brand_id
    left join ref_hits rh on rh.product_id = mp.product_id
    where pt.status = 'published'
    group by pt.id, l.short_name
  ),
  part_scored as (
    select
      d.*,
      search_token_coverage(d.doc, q.tokens) as coverage,
      to_tsvector('english', d.doc) @@ q.tsq as fts,
      ts_rank(to_tsvector('english', d.doc), q.tsq) as rank,
      word_similarity(q.folded, d.doc) as fuzzy
    from part_docs d, query q
    where q.raw <> ''
  ),
  part_hits as (
    select
      s.id, s.name, s.slug, s.part_name, s.part_number, s.thumbnail_url,
      s.license, s.product_name,
      s.ref_score + s.coverage * 2 + s.rank * 4 + s.fuzzy as score
    from part_scored s
    where s.ref_score > 0 or s.coverage >= 1 or s.fts or s.fuzzy > 0.3
    order by score desc, s.name
    limit (select lim from params)
  ),
  brand_scored as (
    select
      b.id, b.name, b.slug, b.logo_url,
      search_token_coverage(b.name, q.tokens) as coverage,
      to_tsvector('english', fold_search_text(concat_ws(' ', b.name, b.description))) @@ q.tsq as fts,
      ts_rank(to_tsvector('english', fold_search_text(concat_ws(' ', b.name, b.description))), q.tsq) as rank,
      word_similarity(q.folded, fold_search_text(b.name)) as fuzzy,
      -- Reversed operands: how much of the brand name appears in the query.
      word_similarity(fold_search_text(b.name), q.folded) as named
    from public.brands b, query q
    where q.raw <> ''
      and exists (
        select 1 from public.products p
        where p.brand_id = b.id and p.parts_count > 0
      )
  ),
  brand_hits as (
    select
      s.id, s.name, s.slug, s.logo_url,
      s.coverage * 2 + s.rank * 4 + s.fuzzy as score
    from brand_scored s
    -- A query naming the brand is enough ("karcher k3" lists Kärcher): the
    -- rest of it usually names a product. Token coverage is not used as the
    -- condition here, since a one-letter token ("k" in "K 3") is contained in
    -- unrelated brand names.
    where s.named >= 0.5 or s.fts or s.fuzzy > 0.3
    order by score desc, s.name
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
        'parts_count', parts_count,
        'reference', reference
      ) order by score desc, name)
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
      ) order by score desc, name)
      from part_hits
    ), '[]'::jsonb),
    'brands', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'name', name,
        'slug', slug,
        'logo_url', logo_url,
        'product_count', product_count
      ) order by score desc, name)
      from brand_results
    ), '[]'::jsonb)
  );
$function$;
