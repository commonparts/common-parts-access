-- Migration: French category names (issue #502)
--
-- Categories are data, so their names are translated in the database. Two
-- locales are planned, English and French: a nullable `name_fr` column on
-- `categories` holds the French name, and `name` stays the English source and
-- the fallback. A translation table would add a join to every read for a
-- single extra language, and remove no code.
--
-- What this migration does, in order:
--
--   1. Adds `categories.name_fr` (nullable, never blank) and seeds the French
--      name of every existing category, keyed by slug. Slugs do not change:
--      they stay the same in both locales.
--   2. Adds `localized_name(name, name_fr, locale)`: the French name on a
--      French page when one is set, the English name otherwise. It is the one
--      rule the functions below apply.
--   3. Replaces `fetch_browse_nav`, `fetch_category_page`, `fetch_brand_nav`
--      and `search_all` with versions taking a trailing `p_locale text
--      default 'en'`: every category name they return is in that locale, and
--      lists ordered by name are ordered by the localized name. `search_all`
--      also matches a product by the English and the French name of its
--      category, whatever the locale.
--
-- Each function is dropped and created again in this transaction, as an
-- argument cannot be added with CREATE OR REPLACE. The new signature accepts
-- every call the previous one did, since `p_locale` has a default, and returns
-- the same result for it: the release in production keeps calling them
-- unchanged. Nothing depends on these functions in the database. Their
-- EXECUTE privilege, lost with the drop, is granted again to the roles that
-- call them.
--
-- The policy "Categories are publicly readable" covers the new column; the
-- table grants of `anon` and `authenticated` (select) are table-wide, so the
-- column needs no grant of its own.
--
-- APPLIED to production on 2026-11-06 as version 20261106140715.

-- 1. categories.name_fr ----------------------------------------------------------

alter table public.categories
  add column if not exists name_fr text;

alter table public.categories
  drop constraint if exists categories_name_fr_not_blank;
alter table public.categories
  add constraint categories_name_fr_not_blank check (name_fr is null or btrim(name_fr) <> '');

comment on column public.categories.name_fr is
  'French name of the category (#502). Null falls back to name, the English source.';

update public.categories c
set name_fr = v.name_fr
from (values
  ('appliances', 'Électroménager'),
  ('carpet-upholstery-cleaner', 'Nettoyeur de tapis et tissus'),
  ('dishwasher', 'Lave-vaisselle'),
  ('dryer', 'Sèche-linge'),
  ('fan-air-treatment', 'Ventilation et traitement de l''air'),
  ('floor-scrubber-sweeper', 'Autolaveuse et balayeuse'),
  ('hard-floor-cleaner', 'Nettoyeur de sols durs'),
  ('iron-garment-care', 'Fer à repasser et soin du linge'),
  ('oven', 'Four'),
  ('refrigerator', 'Réfrigérateur'),
  ('sewing-machine', 'Machine à coudre'),
  ('small-kitchen-appliance', 'Petit électroménager de cuisine'),
  ('air-fryer', 'Friteuse sans huile'),
  ('blender', 'Blender'),
  ('coffee-maker', 'Cafetière'),
  ('cooker', 'Cuiseur'),
  ('rice-cooker', 'Cuiseur à riz'),
  ('food-processor', 'Robot culinaire'),
  ('juicer', 'Extracteur de jus'),
  ('kettle', 'Bouilloire'),
  ('microwave-oven', 'Four à micro-ondes'),
  ('stand-mixer', 'Robot pâtissier'),
  ('toaster', 'Grille-pain'),
  ('steam-cleaner', 'Nettoyeur vapeur'),
  ('vacuum-cleaner', 'Aspirateur'),
  ('canister-vacuum', 'Aspirateur traîneau'),
  ('cordless-stick-vacuum', 'Aspirateur balai sans fil'),
  ('robot-vacuum', 'Aspirateur robot'),
  ('upright-vacuum', 'Aspirateur vertical'),
  ('wet-dry-vacuum', 'Aspirateur eau et poussière'),
  ('window-vacuum', 'Nettoyeur de vitres'),
  ('washing-machine', 'Lave-linge'),
  ('bikes-mobility', 'Vélos et mobilité'),
  ('bicycle', 'Vélo'),
  ('bike-components', 'Composants de vélo'),
  ('e-bike', 'Vélo électrique'),
  ('e-scooter', 'Trottinette électrique'),
  ('cars-and-trucks', 'Voitures et camions'),
  ('car', 'Voiture'),
  ('motorcycle-scooter', 'Moto et scooter'),
  ('furniture', 'Mobilier'),
  ('bed-mattress', 'Lit et matelas'),
  ('chair-seating', 'Chaise et assise'),
  ('lighting', 'Éclairage'),
  ('ceiling-pendant-light', 'Plafonnier et suspension'),
  ('desk-work-lamp', 'Lampe de bureau et d''atelier'),
  ('floor-lamp', 'Lampadaire'),
  ('smart-lighting', 'Éclairage connecté'),
  ('storage-unit', 'Meuble de rangement'),
  ('table-desk', 'Table et bureau'),
  ('gadgets-and-electronics', 'Gadgets et électronique'),
  ('audio-and-hi-fi', 'Audio et hi-fi'),
  ('headphones-and-earphones', 'Casques et écouteurs'),
  ('home-hi-fi', 'Hi-fi de salon'),
  ('microphone', 'Microphone'),
  ('portable-audio', 'Audio portable'),
  ('speaker', 'Enceinte'),
  ('cameras-and-imaging', 'Photo et vidéo'),
  ('action-camera-drone', 'Caméra d''action et drone'),
  ('camera', 'Appareil photo'),
  ('computers-and-peripherals', 'Ordinateurs et périphériques'),
  ('desktop-components', 'Composants d''ordinateur'),
  ('desktop-computer', 'Ordinateur de bureau'),
  ('keyboard-and-mouse', 'Clavier et souris'),
  ('laptop', 'Ordinateur portable'),
  ('storage-drive', 'Stockage et disque'),
  ('gaming', 'Jeu vidéo'),
  ('game-controller', 'Manette de jeu'),
  ('handheld-console', 'Console portable'),
  ('home-console', 'Console de salon'),
  ('networking', 'Réseau'),
  ('personal-care-and-grooming', 'Soins du corps et beauté'),
  ('electric-toothbrush', 'Brosse à dents électrique'),
  ('hair-clipper', 'Tondeuse à cheveux'),
  ('hair-dryer-and-styler', 'Sèche-cheveux et coiffure'),
  ('shaver-and-trimmer', 'Rasoir et tondeuse'),
  ('power-charging', 'Alimentation et recharge'),
  ('printers-scanners', 'Imprimantes et scanners'),
  ('smart-home-and-iot', 'Maison connectée et IoT'),
  ('smartphones-and-tablets', 'Smartphones et tablettes'),
  ('smartphone', 'Smartphone'),
  ('tablet', 'Tablette'),
  ('tv-display', 'TV et écrans'),
  ('monitor', 'Écran d''ordinateur'),
  ('projector', 'Vidéoprojecteur'),
  ('television', 'Téléviseur'),
  ('wearables', 'Objets connectés portables'),
  ('other-category', 'Autre'),
  ('sports-outdoor', 'Sports et plein air'),
  ('camping-hiking', 'Camping et randonnée'),
  ('climbing-mountaineering', 'Escalade et alpinisme'),
  ('fishing', 'Pêche'),
  ('fitness-equipment', 'Équipement de fitness'),
  ('golf-precision-sports', 'Golf et sports de précision'),
  ('hunting-nature', 'Chasse et nature'),
  ('racket-sports', 'Sports de raquette'),
  ('swimming', 'Natation'),
  ('team-sports', 'Sports collectifs'),
  ('water-sports', 'Sports nautiques'),
  ('winter-sports', 'Sports d''hiver'),
  ('tools', 'Outils'),
  ('hand-tool', 'Outil à main'),
  ('hammer', 'Marteau'),
  ('hand-saw', 'Scie à main'),
  ('measuring-marking', 'Mesure et traçage'),
  ('pliers', 'Pince'),
  ('screwdriver', 'Tournevis'),
  ('wrench-socket', 'Clé et douille'),
  ('outdoor-tool', 'Outil de jardin'),
  ('chainsaw', 'Tronçonneuse'),
  ('garden-water-pump', 'Pompe de jardin'),
  ('garden-watering-irrigation', 'Arrosage et irrigation'),
  ('hedge-trimmer', 'Taille-haie'),
  ('lawn-mower', 'Tondeuse à gazon'),
  ('leaf-blower', 'Souffleur de feuilles'),
  ('pressure-washer', 'Nettoyeur haute pression'),
  ('ride-on-mower-tractor', 'Tondeuse autoportée et tracteur'),
  ('robotic-mower', 'Robot tondeuse'),
  ('trimmer-brushcutter', 'Coupe-bordure et débroussailleuse'),
  ('power-tool', 'Outil électroportatif'),
  ('angle-grinder', 'Meuleuse d''angle'),
  ('circular-saw', 'Scie circulaire'),
  ('drill', 'Perceuse'),
  ('heat-gun', 'Décapeur thermique'),
  ('impact-driver', 'Visseuse à chocs'),
  ('jigsaw', 'Scie sauteuse'),
  ('miter-table-saw', 'Scie à onglet et scie sur table'),
  ('nailer-stapler', 'Cloueur et agrafeuse'),
  ('oscillating-multi-tool', 'Outil multifonction oscillant'),
  ('rotary-tool', 'Outil rotatif'),
  ('router-planer', 'Défonceuse et rabot'),
  ('sander', 'Ponceuse'),
  ('tool-battery-charger', 'Batterie et chargeur d''outil'),
  ('safety-equipment', 'Équipement de protection'),
  ('toys-and-games', 'Jouets et jeux'),
  ('action-figure-doll', 'Figurine et poupée'),
  ('building-set', 'Jeu de construction'),
  ('model-railway', 'Train miniature'),
  ('rc-car-truck', 'Voiture et camion radiocommandés'),
  ('slot-car-racing', 'Circuit de voitures')
) as v(slug, name_fr)
where c.slug = v.slug;

-- 2. localized_name ---------------------------------------------------------------

-- Reads no table: an empty search path is enough.
create or replace function public.localized_name(p_name text, p_name_fr text, p_locale text)
returns text
language sql
immutable
set search_path = ''
as $function$
  select case when p_locale = 'fr' then coalesce(p_name_fr, p_name) else p_name end;
$function$;

-- Runs with the caller's privileges inside the RPCs below.
revoke execute on function public.localized_name(text, text, text) from public;
grant execute on function public.localized_name(text, text, text) to anon, authenticated, service_role;

-- 3. Navigation and search functions ----------------------------------------------

drop function if exists public.fetch_browse_nav();

-- Body of 20260926120000, with the root and example leaf names localized.
create function public.fetch_browse_nav(p_locale text default 'en')
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
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
    select c.id, public.localized_name(c.name, c.name_fr, p_locale) as name, c.slug, c.path
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
      from (
        select c.id, c.path, public.localized_name(c.name, c.name_fr, p_locale) as name
        from public.categories c
      ) leaf
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
$function$;

revoke execute on function public.fetch_browse_nav(text) from public;
grant execute on function public.fetch_browse_nav(text) to anon, authenticated, service_role;

drop function if exists public.fetch_category_page(text);

-- Body of 20260926120000, with the category, ancestor and child names
-- localized.
create function public.fetch_category_page(p_slug text, p_locale text default 'en')
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
  with named as (
    select c.id, public.localized_name(c.name, c.name_fr, p_locale) as name,
           c.slug, c.path, c.level, c.parent_id
    from public.categories c
  ),
  target as (
    select id, name, slug, path, level
    from named
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
      from named a, target t
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
      from named c
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
$function$;

revoke execute on function public.fetch_category_page(text, text) from public;
grant execute on function public.fetch_category_page(text, text) to anon, authenticated, service_role;

drop function if exists public.fetch_brand_nav(uuid);

-- Body of 20260926120000, with the covered category names localized.
create function public.fetch_brand_nav(p_brand_id uuid, p_locale text default 'en')
returns jsonb
language sql
stable
set search_path to 'public'
as $function$
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
      public.localized_name(c.name, c.name_fr, p_locale) as name,
      c.slug,
      count(distinct pp.product_id) filter (where pp.part_id is not null)::int as product_count,
      count(distinct pp.part_id)::int as parts_count
    from product_parts pp
    join public.categories c on c.id = pp.category_id
    group by c.id, c.name, c.name_fr, c.slug
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
$function$;

revoke execute on function public.fetch_brand_nav(uuid, text) from public;
grant execute on function public.fetch_brand_nav(uuid, text) to anon, authenticated, service_role;

drop function if exists public.search_all(text, integer);

-- Body of 20261030104531. Changed: a product document also holds the English
-- and the French name of its category, so a query naming a category in either
-- language matches the products in it ("aspirateur dyson", "dyson vacuum");
-- the `category` returned is the name in p_locale.
create function public.search_all(
  search_query text,
  result_limit integer default 5,
  p_locale text default 'en'
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
      pr.parts_count, pr.is_listed,
      public.localized_name(c.name, c.name_fr, p_locale) as category,
      fold_search_text(concat_ws(' ', b.name, pr.name, c.name, c.name_fr)) as doc,
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

revoke execute on function public.search_all(text, integer, text) from public;
grant execute on function public.search_all(text, integer, text) to anon, authenticated, service_role;
