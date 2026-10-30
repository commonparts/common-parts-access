-- Migration: typo-tolerant token matching (issue #452, point 4)
--
-- 20261030104338 makes a search served only by a full match: every query
-- token found. A token with a typo ("dysn v10") only counted its trigram
-- similarity, below 1, so the search was logged as `approximate` and its
-- results shown as close matches. Lowering the trigram threshold cannot fix
-- it: "dysn" / "dyson" scores 0.375 in trigram similarity and "cooper" /
-- "copper" 0.4, so no threshold accepts the typo without pairing two words.
--
-- A token now also counts as found when a word of the document is within a
-- small edit distance of it, and only when the token is a typo candidate:
--   - letters only, 4 letters or more: model numbers ("v10" / "v11") never
--     match a neighbour;
--   - contained in no product or part document: a word the catalog knows is
--     never read as another one. Applied to the 886 catalog words of 4
--     letters or more on 2026-10-30, the distance rule below matches one
--     catalog word to another 131 times, each direction counted (power /
--     mower / tower, shark / sharp, magic / mavic, latch / watch,
--     karcher / archer);
--   - distance 1 from 5 letters, 2 from 8 letters; a 4-letter token only
--     matches a word with one more letter ("dysn" / "dyson", "bosh" /
--     "bosch"), as a substitution pairs too many short words ("mini" /
--     "midi").
-- A query whose tokens are all found this way is a full match, so "dysn v10"
-- is served like "dyson v10".
--
-- Known limit, accepted: Levenshtein counts a swap of two adjacent letters
-- as 2 edits, so a swap in a word of 5 to 7 letters ("dsyon", "bsoch") is
-- not corrected. `fuzzystrmatch` has no variant that counts it as one edit.
--
-- What this migration does, in order:
--
--   1. Installs `fuzzystrmatch` in the `extensions` schema, for
--      `levenshtein_less_equal()`.
--   2. Adds `search_typo_match(token, word)`: the distance rule above.
--   3. Adds `search_token_coverage(doc, tokens, typo_tokens)`: the coverage
--      of 20260925200000, plus the typo match for the tokens listed in
--      `typo_tokens`. The two-argument version now calls it with no typo
--      token and behaves as before, so `search_product_candidates()` is
--      unchanged.
--   4. Replaces `search_all`: a `typo_tokens` step lists the typo candidates
--      of the query, and products and parts use the three-argument
--      coverage. `part_docs` moves ahead of the scoring so that step can
--      read it. Nothing else changes from 20261030104338; brands keep the
--      two-argument coverage.
--
-- Requires 20261030104338_search_miss_outcomes.sql. Additive: applied when
-- the PR lands on `dev`. Checked against the catalog on 2026-10-30: "dysn",
-- "karchr", "phillips", "bosh" and "nespreso" are corrected; "power",
-- "shark" and "mower" are catalog words and are not; "cooper" can only reach
-- "cooker" and "cooler", and no document holds "mini" with either, so
-- "mini cooper" stays `approximate`.
--
-- APPLIED to production on 2026-10-30 as version 20261030104531.

-- 1. Extension.
create extension if not exists fuzzystrmatch with schema extensions;

-- 2. Typo distance between a query token and a document word.
create or replace function public.search_typo_match(token text, word text)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  -- CASE evaluates its branches in order, unlike AND: the length check
  -- always runs first, so levenshtein_less_equal(), which raises an error
  -- above 255 characters, never sees a long word (tag length is not bounded
  -- in the database; tokens are at most 100 characters).
  select case
      when pg_catalog.abs(pg_catalog.length(word) - pg_catalog.length(token)) > 2 then false
      when pg_catalog.length(token) >= 8 then extensions.levenshtein_less_equal(token, word, 2) <= 2
      when pg_catalog.length(token) >= 5 then extensions.levenshtein_less_equal(token, word, 1) <= 1
      -- One missing letter only: a substitution pairs too many short words.
      when pg_catalog.length(token) = 4 then
        pg_catalog.length(word) = 5 and extensions.levenshtein_less_equal(token, word, 1) <= 1
      else false
    end
$$;

comment on function public.search_typo_match(text, text) is
  'Whether a document word is within typo distance of a query token: 1 edit from 5 letters, 2 from 8, one missing letter for 4 letters (issue #452).';

-- 3. Token coverage with typo tolerance.
create or replace function public.search_token_coverage(doc text, tokens text[], typo_tokens text[])
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
      -- A typo candidate counts fully when a word of the document is within
      -- typo distance; see search_all's typo_tokens for who is a candidate.
      when t = any(typo_tokens) and exists (
             select 1
             from pg_catalog.regexp_split_to_table(public.fold_search_text(doc), '[^a-z0-9]+') as w
             where public.search_typo_match(t, w)
           ) then 1
      when public.word_similarity(t, public.fold_search_text(doc)) >= 0.5
        then public.word_similarity(t, public.fold_search_text(doc))
      else 0
    end
  ), 0)::real
  from pg_catalog.unnest(tokens) as t
  where public.normalize_product_reference(t) <> ''
$$;

comment on function public.search_token_coverage(text, text[], text[]) is
  'Share of query tokens found in doc, from 0 to 1: compact substring or, for the tokens in typo_tokens, a word within typo distance count 1; otherwise trigram word similarity >= 0.5 (issues #319, #452).';

-- Same result as before: no token is a typo candidate.
create or replace function public.search_token_coverage(doc text, tokens text[])
returns real
language sql
immutable
parallel safe
set search_path = ''
as $$
  select public.search_token_coverage(doc, tokens, '{}'::text[])
$$;

-- Helpers run with the caller's privileges inside search_all() (see Data API
-- grants in docs/DATA_MODEL.md).
grant execute on function public.search_typo_match(text, text) to anon, authenticated, service_role;
grant execute on function public.search_token_coverage(text, text[], text[]) to anon, authenticated, service_role;

-- 4. search_all.
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
  -- Query tokens that no product or part document contains (issue #452):
  -- the only ones a typo can explain. Letters only, so a model number
  -- ("v11", "qp6520") is never matched to a neighbouring one, and a word the
  -- catalog knows ("power") is never read as another one ("mower").
  typo_tokens as (
    select array(
      select t
      from query q, unnest(q.tokens) as t
      where t ~ '^[a-z]{4,}$'
        and not exists (select 1 from product_docs d where strpos(d.doc, t) > 0)
        and not exists (select 1 from part_docs d where strpos(d.doc, t) > 0)
    ) as tokens
  ),
  product_scored as (
    select
      d.*,
      search_token_coverage(d.doc, q.tokens, tt.tokens) as coverage,
      to_tsvector('english', d.doc) @@ q.tsq as fts,
      ts_rank(to_tsvector('english', d.doc), q.tsq) as rank,
      word_similarity(q.folded, d.doc) as fuzzy
    from product_docs d, query q, typo_tokens tt
    where q.raw <> ''
  ),
  product_hits as (
    select
      s.id, s.name, s.slug, s.image_url, s.category, s.parts_count, s.reference,
      s.ref_score,
      -- Full match (issue #452): every query token found (as written, or
      -- through a typo for a token the catalog does not know), a full-text
      -- match or a reference hit. A hit above the trigram threshold alone is
      -- a close match.
      (s.ref_score > 0 or s.coverage >= 1 or s.fts) as full_match,
      -- Listed bonus 1: ahead of an unlisted product matching as well.
      s.ref_score + s.coverage * 2 + s.rank * 4 + s.fuzzy
        + case when s.is_listed then 1 else 0 end as score
    from product_scored s
    where s.ref_score > 0 or s.coverage >= 1 or s.fts or s.fuzzy > 0.3
    -- ref_score leads the order (exact 8, prefix 6, none 0) so a reference
    -- hit always outranks a name hit, whatever the name-match score and the
    -- listed bonus add up to; full matches come before close matches, and
    -- the score orders products within each tier.
    order by s.ref_score desc, full_match desc, score desc, s.name
    limit (select lim from params)
  ),
  part_scored as (
    select
      d.*,
      search_token_coverage(d.doc, q.tokens, tt.tokens) as coverage,
      to_tsvector('english', d.doc) @@ q.tsq as fts,
      ts_rank(to_tsvector('english', d.doc), q.tsq) as rank,
      word_similarity(q.folded, d.doc) as fuzzy
    from part_docs d, query q, typo_tokens tt
    where q.raw <> ''
  ),
  part_hits as (
    select
      s.id, s.name, s.slug, s.part_name, s.part_number, s.thumbnail_url,
      s.license, s.product_name,
      -- Same definition as product_hits.full_match.
      (s.ref_score > 0 or s.coverage >= 1 or s.fts) as full_match,
      s.ref_score + s.coverage * 2 + s.rank * 4 + s.fuzzy as score
    from part_scored s
    where s.ref_score > 0 or s.coverage >= 1 or s.fts or s.fuzzy > 0.3
    order by full_match desc, score desc, s.name
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
        'reference', reference,
        'full_match', full_match
      ) order by ref_score desc, full_match desc, score desc, name)
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
        'full_match', full_match,
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
      ) order by full_match desc, score desc, name)
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

grant execute on function public.search_all(text, integer) to anon, authenticated, service_role;
