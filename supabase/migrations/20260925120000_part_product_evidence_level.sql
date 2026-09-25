-- Migration: evidence level on part-product compatibilities (issue #317)
--
-- `parts.verification_status` describes the part as a whole, but whether a
-- part fits is a property of the part–product pair: the same wheel can be
-- confirmed on one dishwasher and merely claimed on another. The evidence now
-- lives on the `part_products` link itself.
--
-- What this migration does, in order:
--
--   1. Adds `part_products.evidence_level`:
--        - `declared`  the source or a curator claims the fit
--        - `confirmed` at least one positive print report
--        - `disputed`  negative reports outnumber positive ones
--      Not null, default `declared`, so every existing link becomes `declared`
--      as part of the ALTER itself — no backfill statement is needed.
--   2. Adds `part_product_evidence_level(positive, negative)`, the single rule
--      turning print report counts into a level. Print reports do not exist
--      yet (issue #318); the trigger that keeps the column in sync will call
--      this function, so the rule is fixed here and not re-derived there.
--   3. Makes the column server-owned. The "Owner insert" policy lets a part's
--      owner insert links, and the table-level INSERT grant covers every
--      column, so an owner could otherwise self-grant `confirmed` through the
--      API. INSERT and UPDATE are narrowed to (part_id, product_id) for `anon`
--      and `authenticated`: the app only ever sends those two keys, and the
--      evidence level is only written by the database (report trigger) or the
--      service role. There is no UPDATE policy today; narrowing UPDATE as well
--      keeps the column protected if one is added later.
--
-- `parts.verification_status` is left untouched (out of scope for #317).
--
-- NOT APPLIED. Additive only (new column with a default, new function, grant
-- changes that match what the app already sends), so it is safe to apply
-- ahead of the deploy.

-- 1. The column. Existing rows take the default.
alter table public.part_products
  add column evidence_level text not null default 'declared'
    constraint part_products_evidence_level_check
    check (evidence_level in ('declared', 'confirmed', 'disputed'));

comment on column public.part_products.evidence_level is
  'How well this part–product fit is established: declared | confirmed | disputed (issue #317).';

-- 2. The rule, from report counts to a level. Checked in this order:
--    more negative than positive reports → disputed (a single negative report
--    with no positive one included); otherwise any positive report →
--    confirmed; otherwise the claim stands as declared.
create or replace function public.part_product_evidence_level(
  positive_reports integer,
  negative_reports integer
)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when coalesce(negative_reports, 0) > coalesce(positive_reports, 0) then 'disputed'
    when coalesce(positive_reports, 0) >= 1 then 'confirmed'
    else 'declared'
  end
$$;

comment on function public.part_product_evidence_level(integer, integer) is
  'Evidence level of a part–product fit from its positive and negative print report counts (issue #317).';

-- 3. Only the link itself is client-writable.
revoke insert, update on public.part_products from anon, authenticated;
grant insert (part_id, product_id) on public.part_products to anon, authenticated;
grant update (part_id, product_id) on public.part_products to anon, authenticated;
