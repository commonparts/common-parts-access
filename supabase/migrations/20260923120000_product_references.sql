-- Migration: product references (issue #316)
--
-- A product is a commercial name ("OneBlade Pro", "K 3 Power Control"). It
-- groups many manufacturer references (QP6520/20, QP6520/30), may be sold
-- under other commercial names depending on the region, and carries barcodes.
-- Users identify their device by the reference printed on it, so those values
-- need a home of their own, searchable independently of how they were typed.
--
-- What this migration does, in order:
--
--   1. Adds `normalize_product_reference(text)`: uppercase, with whitespace,
--      hyphens, slashes and dots removed. "QP 6520/20", "qp6520-20" and
--      "QP652020" all become "QP652020". It is IMMUTABLE so it can back a
--      generated column, and public so the search issue can normalize a query
--      with exactly the same rule instead of re-implementing it client-side.
--   2. Creates `product_references`, one row per known value of a product:
--        - `value`            as displayed, trimmed
--        - `normalized_value` generated from `value` with the function above,
--                             so normalization never depends on the client
--        - `type`             manufacturer_ref | commercial_name | ean
--        - `region`           ISO 3166-1 alpha-2, null = every region
--        - `language`         BCP 47 tag, null = unspecified
--        - `source`           curation | search | import
--      Unique on (product_id, normalized_value, type): the same reference may
--      legitimately exist as two types (a commercial name equal to a
--      reference), but never twice with the same type on one product.
--   3. Indexes `normalized_value` with text_pattern_ops so `like 'QP652%'`
--      prefix lookups use the index whatever the database collation. The
--      unique constraint already leads with `product_id`, which serves the
--      per-product listing on the product page.
--   4. Enables RLS with a public SELECT policy only. There is no admin role in
--      the schema yet, so no INSERT/UPDATE/DELETE policy is granted: curation
--      happens through the Supabase dashboard / service role (which bypasses
--      RLS), as for brands. The write policy for the reference attachment flow
--      ships with the search issue.
--
-- NOT APPLIED -- the human applies this migration.

-- 1. Normalization rule, shared by the table and future search queries.
create or replace function public.normalize_product_reference(value text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select upper(pg_catalog.regexp_replace(value, '[[:space:]./-]', '', 'g'))
$$;

comment on function public.normalize_product_reference(text) is
  'Canonical form of a product reference: uppercase, without whitespace, hyphens, slashes or dots.';

-- 2. The table.
create table public.product_references (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references public.products (id) on delete cascade,
  value            text not null
                   check (value = btrim(value) and length(value) between 1 and 200),
  normalized_value text not null
                   generated always as (public.normalize_product_reference(value)) stored,
  type             text not null
                   check (type in ('manufacturer_ref', 'commercial_name', 'ean')),
  region           text
                   check (region ~ '^[A-Z]{2}$'),
  language         text
                   check (language ~ '^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$' and length(language) <= 35),
  source           text not null default 'curation'
                   check (source in ('curation', 'search', 'import')),
  created_at       timestamptz not null default now(),
  -- A value made only of separators ("--", " / ") normalizes to nothing and
  -- could never be matched.
  constraint product_references_normalized_not_empty check (normalized_value <> ''),
  constraint product_references_product_value_type_key
    unique (product_id, normalized_value, type)
);

comment on table public.product_references is
  'Manufacturer references, regional commercial names and barcodes a product is known by (issue #316).';

-- 3. Prefix search on the normalized value.
create index idx_product_references_normalized_prefix
  on public.product_references (normalized_value text_pattern_ops);

-- 4. RLS: public read; writes only through the service role for now.
alter table public.product_references enable row level security;

create policy "Product references are publicly readable"
  on public.product_references
  for select
  using (true);
