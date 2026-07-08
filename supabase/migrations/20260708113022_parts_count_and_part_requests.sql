-- Migration: denormalized parts_count + part_requests table (issue #227)
--
-- Two backend capabilities for the search/product-page UI:
--  1. products.parts_count — "N parts available" without a count query per row.
--  2. part_requests — captures part demand ("Request this part") as structured,
--     aggregatable curation data, deliberately kept OUT of the feedback table
--     (no triage pipeline, no GitHub issue per request, different lifecycle,
--     and public aggregate display is incompatible with feedback's RLS).
--
-- To be validated and executed by the human — never applied by the agent.

-- ============================================================================
-- 1. products.parts_count (trigger-maintained)
-- ============================================================================

alter table public.products
  add column if not exists parts_count integer not null default 0;

-- Recomputes one product's count: distinct PUBLISHED models linked to the
-- product itself or, when it is a family, to any of its variants. Mirrors
-- fetch_family_parts / search_all semantics (issue #225/#226).
-- SECURITY DEFINER: products has no UPDATE policy, so the maintenance path must
-- bypass RLS (a model owner mutating model_products must still update products).
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
    select count(distinct mp.model_id)
    from public.model_products mp
    join public.models m on m.id = mp.model_id and m.status = 'published'
    where mp.product_id = p.id
      or mp.product_id in (
        select v.id from public.products v where v.parent_id = p.id
      )
  )
  where p.id = p_product_id;
end;
$$;

-- model_products insert/delete: recompute the linked product and, if it is a
-- variant, its parent family (whose aggregate includes the variant's parts).
create or replace function public.trg_model_products_parts_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_product uuid;
  affected_parent uuid;
begin
  -- NEW is null on DELETE and OLD is null on INSERT; branch on TG_OP rather
  -- than referencing a field of the null record.
  if tg_op = 'DELETE' then
    affected_product := old.product_id;
  else
    affected_product := new.product_id;
  end if;

  perform public.recompute_product_parts_count(affected_product);

  select parent_id into affected_parent
  from public.products where id = affected_product;

  if affected_parent is not null then
    perform public.recompute_product_parts_count(affected_parent);
  end if;

  return null;
end;
$$;

create trigger model_products_parts_count
  after insert or delete on public.model_products
  for each row execute function public.trg_model_products_parts_count();

-- model status change: a model entering/leaving 'published' changes the count
-- of every product it is linked to (and those products' parent families).
create or replace function public.trg_models_status_parts_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec record;
begin
  for rec in
    select distinct p.id as product_id, p.parent_id
    from public.model_products mp
    join public.products p on p.id = mp.product_id
    where mp.model_id = new.id
  loop
    perform public.recompute_product_parts_count(rec.product_id);
    if rec.parent_id is not null then
      perform public.recompute_product_parts_count(rec.parent_id);
    end if;
  end loop;

  return null;
end;
$$;

create trigger models_status_parts_count
  after update of status on public.models
  for each row
  when (old.status is distinct from new.status)
  execute function public.trg_models_status_parts_count();

-- Backfill existing rows to a correct starting value.
update public.products p
set parts_count = (
  select count(distinct mp.model_id)
  from public.model_products mp
  join public.models m on m.id = mp.model_id and m.status = 'published'
  where mp.product_id = p.id
    or mp.product_id in (
      select v.id from public.products v where v.parent_id = p.id
    )
);

-- ============================================================================
-- 2. part_requests table
-- ============================================================================

create table if not exists public.part_requests (
  id                    uuid primary key default gen_random_uuid(),
  product_id            uuid references public.products(id) on delete set null,
  raw_query             text check (char_length(raw_query) <= 200),
  description           text check (char_length(description) <= 500),
  user_id               uuid references public.user_profiles(id) on delete set null,
  page_url              text check (char_length(page_url) <= 2048),
  status                text not null default 'open'
                          check (status in ('open', 'fulfilled', 'dismissed')),
  fulfilled_by_model_id uuid references public.models(id) on delete set null,
  created_at            timestamptz default now()
);

create index if not exists idx_part_requests_product on public.part_requests using btree (product_id);
create index if not exists idx_part_requests_status  on public.part_requests using btree (status);

alter table public.part_requests enable row level security;

-- Anonymous or authenticated insert; the API validates the payload server-side.
-- Users may only self-attribute (or stay anonymous with a null user_id) — they
-- cannot forge another user's id.
create policy "Anyone can submit a part request"
  on public.part_requests for insert
  with check (user_id is null or user_id = auth.uid());

-- No SELECT / UPDATE / DELETE policies: part_requests is never readable at row
-- level by the public. All public consumption goes through the aggregation RPC
-- below, which exposes only description + count (no user_id, no raw_query).

-- ============================================================================
-- 3. Aggregation RPC — description + count only, no personal data
-- ============================================================================

-- SECURITY DEFINER so it can read the table despite the absence of a SELECT
-- policy. Returns only aggregated, non-identifying data for open demand.
create or replace function public.fetch_part_request_counts(p_product_id uuid)
returns table (description text, request_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select btrim(pr.description) as description, count(*) as request_count
  from public.part_requests pr
  where pr.product_id = p_product_id
    and pr.status = 'open'
    and pr.description is not null
    and btrim(pr.description) <> ''
  group by btrim(pr.description)
  order by request_count desc, description asc
  limit 100;
$$;

grant execute on function public.fetch_part_request_counts(uuid) to anon, authenticated;
