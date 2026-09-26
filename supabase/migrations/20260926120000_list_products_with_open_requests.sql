-- Migration: list products with an open part request (issue #321)
--
-- Since #312 (migration 20260922120000) public navigation and search only
-- surface products with a published part, and the brands and categories
-- holding them. A product somebody asked a part for is demand the catalog
-- should show too: this migration makes "listed" mean "has a published part
-- OR an open part request", and lets search reach every product so a visitor
-- can find any device and request its part.
--
-- What this migration does, in order:
--
--   1. Adds `products.open_requests_count`, trigger-maintained like
--      `parts_count` (#227): the number of `part_requests` rows with status
--      'open' for the product. part_requests has no SELECT policy, and the
--      navigation RPCs are SECURITY INVOKER, so they cannot read it directly;
--      a count on products is public-safe (fetch_part_request_counts already
--      exposes open-demand counts per product).
--   2. Adds `products.is_listed`, a stored generated column:
--      parts_count > 0 or open_requests_count > 0. It is the single
--      visibility predicate for every public listing — navigation, search
--      ranking and, later, the sitemap (#257).
--   3. Replaces the navigation RPCs so a product, brand or category is
--      returned when it holds a listed product. Counts are unchanged:
--      parts_count counts distinct published parts and product_count counts
--      products with a published part only, so a brand listed through a
--      request alone reads "0 parts across 0 products".
--   4. Replaces search_all:
--        - products: every product is searchable again (hidden ones stay
--          reachable so a visitor can open them and request a part); a listed
--          product gets a +1 score bonus, which puts it ahead of an unlisted
--          one matching as well; reference hits now lead the order
--          explicitly (exact, then prefix, then name hits) instead of
--          relying on their score weight, so no bonus can outrank them;
--        - brands: only brands holding a listed product, product_count still
--          counting products with a published part;
--        - parts: unchanged.
--
-- No data is deleted or hidden at row level: unlisted products keep their
-- pages and remain in the publish flow (/api/products lists everything).
--
-- Adds a partial index on (brand_id, name) where is_listed: the /brands
-- listings filter on it by brand and order by name, the brand checks of
-- search_all and findExactBrandMatch test it per brand, and the nav RPCs
-- scan every listed product — a small share of the catalog (41 of 871 when
-- written), so the partial index stays small as unlisted products grow.
--
-- To be validated and executed by the human — not applied by the agent.

-- ============================================================================
-- 1. products.open_requests_count (trigger-maintained)
-- ============================================================================

alter table public.products
  add column open_requests_count integer not null default 0;

comment on column public.products.open_requests_count is
  'Number of open part_requests for the product (trigger-maintained, issue #321).';

-- SECURITY DEFINER: part_requests has no SELECT policy and products no
-- UPDATE policy, while any visitor (anonymous included) inserts requests.
--
-- The product row is locked before counting. Without the lock, two
-- concurrent writers (a new request and a dismissal on the same product)
-- each count from a snapshot missing the other's uncommitted row, and the
-- later UPDATE can store a stale count — e.g. 0 while a request is open,
-- unlisting the product. With it, the second writer waits for the first to
-- commit, and its count statement then takes a fresh snapshot (READ
-- COMMITTED) that includes the first writer's row.
create or replace function public.recompute_product_open_requests_count(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_product_id is null then
    return;
  end if;

  perform 1 from public.products where id = p_product_id for update;

  update public.products p
  set open_requests_count = (
    select count(*)
    from public.part_requests pr
    where pr.product_id = p.id
      and pr.status = 'open'
  )
  where p.id = p_product_id;
end;
$$;

-- A request is created open, is later fulfilled or dismissed, and can lose
-- its product (on delete set null): recompute the old and the new product.
-- Branches on TG_OP rather than reading a field of the null OLD/NEW record.
-- A move locks both products in id order, so two opposite moves cannot
-- deadlock (least/greatest skip a null id).
create or replace function public.trg_part_requests_open_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.recompute_product_open_requests_count(new.product_id);
  elsif tg_op = 'DELETE' then
    perform public.recompute_product_open_requests_count(old.product_id);
  elsif new.product_id is distinct from old.product_id then
    perform public.recompute_product_open_requests_count(least(old.product_id, new.product_id));
    if old.product_id is not null and new.product_id is not null then
      perform public.recompute_product_open_requests_count(greatest(old.product_id, new.product_id));
    end if;
  else
    perform public.recompute_product_open_requests_count(old.product_id);
  end if;

  return null;
end;
$$;

-- Maintenance only, like recompute_product_parts_count: never callable from
-- the API, where it would let anyone rewrite a product's count.
revoke execute on function public.recompute_product_open_requests_count(uuid)
  from public, anon, authenticated;
revoke execute on function public.trg_part_requests_open_count()
  from public, anon, authenticated;

create trigger part_requests_open_count
  after insert or delete or update of status, product_id on public.part_requests
  for each row execute function public.trg_part_requests_open_count();

-- Backfill (zero open requests in production when written, kept for replays).
update public.products p
set open_requests_count = (
  select count(*)
  from public.part_requests pr
  where pr.product_id = p.id
    and pr.status = 'open'
);

-- ============================================================================
-- 2. products.is_listed
-- ============================================================================

alter table public.products
  add column is_listed boolean
    generated always as (parts_count > 0 or open_requests_count > 0) stored;

create index products_listed_brand_name_idx
  on public.products (brand_id, name)
  where is_listed;

comment on column public.products.is_listed is
  'True when the product has a published part or an open part request: the visibility rule of public listings (issues #312, #321).';

-- ============================================================================
-- 3. Navigation RPCs
-- ============================================================================

-- In every function below, a listed product is joined with LEFT joins to its
-- published parts so it survives without one; `filter (where pt.id is not
-- null)` keeps product_count to products with a published part.

create or replace function public.fetch_browse_nav()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with listed as (
    -- One row per (listed product, published part) pair; null part for a
    -- product listed through a request only.
    select p.id as product_id, p.brand_id, p.category_id, pt.id as part_id
    from public.products p
    left join public.part_products mp on mp.product_id = p.id
    left join public.parts pt on pt.id = mp.part_id and pt.status = 'published'
    where p.is_listed
  ),
  brand_totals as (
    select
      l.brand_id,
      count(distinct l.product_id) filter (where l.part_id is not null)::int as product_count,
      count(distinct l.part_id)::int as parts_count
    from listed l
    where l.brand_id is not null
    group by l.brand_id
  ),
  roots as (
    select c.id, c.name, c.slug, c.path
    from public.categories c
    where c.level = 0
  ),
  -- A root whose subtree holds no listed product yields no row and is left
  -- off the hub.
  root_totals as (
    select
      r.id,
      count(distinct l.product_id) filter (where l.part_id is not null)::int as product_count,
      count(distinct l.part_id)::int as parts_count
    from roots r
    join public.categories sub on starts_with(sub.path, r.path)
    join listed l on l.category_id = sub.id
    group by r.id
  ),
  direct_totals as (
    select
      l.category_id,
      count(distinct l.product_id) filter (where l.part_id is not null)::int as product_count,
      count(distinct l.part_id)::int as parts_count
    from listed l
    where l.category_id is not null
    group by l.category_id
  ),
  -- Up to three example leaves per root among leaves holding a listed
  -- product, most parts first.
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
  -- Subtree totals for the target and each of its direct children, over
  -- listed products only. The left join on products keeps the target row
  -- alive at zero (its page still renders); listed_count decides whether a
  -- child is navigable.
  subtree as (
    select
      c.id,
      count(distinct p.id)::int as listed_count,
      count(distinct p.id) filter (where pt.id is not null)::int as product_count,
      count(distinct pt.id)::int as parts_count
    from public.categories c
    join public.categories sub on starts_with(sub.path, c.path)
    left join public.products p on p.category_id = sub.id and p.is_listed
    left join public.part_products mp on mp.product_id = p.id
    left join public.parts pt on pt.id = mp.part_id and pt.status = 'published'
    where c.id = (select id from target)
       or c.parent_id = (select id from target)
    group by c.id
  ),
  -- Brands of the target's *direct* listed products: the chips link to
  -- /brands/[brand]/[category], which lists exactly those.
  covering_brands as (
    select
      b.id,
      b.name,
      b.slug,
      count(distinct p.id) filter (where pt.id is not null)::int as product_count,
      count(distinct pt.id)::int as parts_count
    from public.products p
    join public.brands b on b.id = p.brand_id
    left join public.part_products mp on mp.product_id = p.id
    left join public.parts pt on pt.id = mp.part_id and pt.status = 'published'
    where p.category_id = (select id from target)
      and p.is_listed
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
    -- Children without a listed product in their subtree are not navigable;
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
                where starts_with(sub.path, g.path)
                  and p.is_listed
              )
          )
        )
        order by c.name
      )
      from public.categories c
      join subtree s on s.id = c.id
      where c.parent_id = (select id from target)
        and s.listed_count > 0
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

create or replace function public.fetch_brand_nav(p_brand_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with product_parts as (
    -- One row per (listed product, published part) pair of this brand; null
    -- part for a product listed through a request only.
    select p.id as product_id, p.category_id, pt.id as part_id
    from public.products p
    left join public.part_products mp on mp.product_id = p.id
    left join public.parts pt on pt.id = mp.part_id and pt.status = 'published'
    where p.brand_id = p_brand_id
      and p.is_listed
  ),
  totals as (
    select
      count(distinct product_id) filter (where part_id is not null)::int as product_count,
      count(distinct part_id)::int as parts_count
    from product_parts
  ),
  -- Categories holding a listed product of this brand. Products without a
  -- category cannot appear in the navigation either way.
  covered_categories as (
    select
      c.id,
      c.name,
      c.slug,
      count(distinct pp.product_id) filter (where pp.part_id is not null)::int as product_count,
      count(distinct pp.part_id)::int as parts_count
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

-- ============================================================================
-- 4. search_all
-- ============================================================================

-- Same function as 20260925200000 except: product_docs covers every product
-- and carries is_listed, product_hits adds the listed bonus and orders by
-- ref_score first, and brands require a listed product instead of one with
-- parts.

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
  -- Every product is searchable (issue #321): an unlisted one is how a
  -- visitor reaches a device nobody has published or requested a part for.
  product_docs as (
    select
      pr.id, pr.name, pr.slug, pr.image_url,
      pr.parts_count, pr.is_listed, c.name as category,
      fold_search_text(concat_ws(' ', b.name, pr.name)) as doc,
      rh.reference, coalesce(rh.ref_score, 0) as ref_score
    from public.products pr
    left join public.brands b on b.id = pr.brand_id
    left join public.categories c on c.id = pr.category_id
    left join ref_hits rh on rh.product_id = pr.id
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
      s.ref_score,
      -- Listed bonus 1: ahead of an unlisted product matching as well.
      s.ref_score + s.coverage * 2 + s.rank * 4 + s.fuzzy
        + case when s.is_listed then 1 else 0 end as score
    from product_scored s
    where s.ref_score > 0 or s.coverage >= 1 or s.fts or s.fuzzy > 0.3
    -- ref_score leads the order (exact 8, prefix 6, none 0) so a reference
    -- hit always outranks a name hit, whatever the name-match score and the
    -- listed bonus add up to; the score orders products within each tier.
    order by s.ref_score desc, score desc, s.name
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
  -- Only brands holding a listed product are searchable (issues #312, #321).
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
        where p.brand_id = b.id and p.is_listed
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
  -- product_count counts products with a published part, matching the hub.
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
      ) order by ref_score desc, score desc, name)
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

grant execute on function public.search_all(text, integer) to anon, authenticated;
