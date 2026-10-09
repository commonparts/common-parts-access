-- Migration: explicit Data API grants on the public schema (issue #131)
--
-- Supabase is changing the default privileges of the `public` schema. Until
-- now every table, sequence and function created there by `postgres` was
-- automatically granted to `anon`, `authenticated` and `service_role`, so it
-- was reachable through the Data API (PostgREST, supabase-js) the moment it
-- existed. From October 30, 2026 those automatic grants stop for tables and
-- sequences in existing projects (new projects since May 30, 2026): a table
-- is only reachable through the Data API once a migration grants it.
--
-- Objects that already exist keep the grants they hold. The application
-- keeps working on October 30 without this migration; what breaks is a
-- database rebuilt from `supabase/migrations/` (a new project, a branch, a
-- local stack), where no table ever received a grant, and every future
-- migration that creates a table and forgets to grant it.
--
-- What this migration does, in order:
--
--   1. Checks that every table in `public` has RLS enabled, and aborts
--      otherwise: a grant on a table without RLS exposes all of its rows.
--   2. Grants each client role, table by table, the privileges its RLS
--      policies can use. The rule is mechanical, so it can be re-checked
--      against `pg_policies`: a role gets a command on a table when at least
--      one policy for that command (or `ALL`) applies to it. A policy on role
--      `public` applies to both `anon` and `authenticated`. A grant with no
--      matching policy would let nothing through under RLS, so it is not
--      granted. `print_reports` and `search_misses` have no policy and get
--      no client grant (#318, #320).
--   3. Grants `service_role` full read and write on every table. It bypasses
--      RLS and is used only server-side (`lib/supabase/admin.ts`, Edge
--      Functions).
--   4. Grants EXECUTE explicitly on the functions the Data API reaches that
--      had relied on the default: `search_product_candidates()` (an RPC) and
--      the helpers that run with the caller's privileges inside RPCs,
--      triggers and generated columns. Trigger functions need no grant: their
--      EXECUTE privilege is checked when the trigger is created, not when it
--      fires.
--   5. Applies the new Supabase defaults for tables and sequences now, so a
--      migration that forgets its grants fails today instead of after
--      October 30. The statements Supabase publishes revoke SELECT, INSERT,
--      UPDATE and DELETE only; this migration revokes ALL, so a new table no
--      longer gives the API roles TRUNCATE, REFERENCES or TRIGGER either.
--      Function defaults are unchanged (not part of the platform change).
--
-- Nothing is revoked from existing objects: the broader privileges every
-- table received from the old defaults (for example DELETE on `brands` for
-- `anon`) stay in place and remain filtered by RLS. Every statement is a
-- GRANT or a default-privilege change, so the migration is idempotent and
-- changes no behaviour of the running application.

-- 1. RLS guard ----------------------------------------------------------------

do $$
declare
  unprotected text;
begin
  select string_agg(c.relname, ', ' order by c.relname)
    into unprotected
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relkind in ('r', 'p')
     and not c.relrowsecurity;

  if unprotected is not null then
    raise exception 'RLS is disabled on public table(s): %. Enable RLS before granting Data API access.', unprotected;
  end if;
end;
$$;

-- 2. Client roles: privileges derived from the RLS policies --------------------

-- Reference data, publicly readable.
grant select on public.brands to anon, authenticated;
grant select on public.categories to anon, authenticated;
grant select on public.licenses to anon, authenticated;
grant select on public.source_platforms to anon, authenticated;
grant select on public.product_references to anon, authenticated;

-- Products: public read, insert by signed-in users only.
grant select on public.products to anon, authenticated;
grant insert on public.products to authenticated;

-- Parts and their files: public read of published rows, owner management.
grant select, insert, update, delete on public.parts to anon, authenticated;
grant select, insert, update, delete on public.part_files to anon, authenticated;

-- Part–product links: `evidence_level` stays server-owned, so INSERT and
-- UPDATE remain limited to the two key columns (#317).
grant select, delete on public.part_products to anon, authenticated;
grant insert (part_id, product_id) on public.part_products to anon, authenticated;
grant update (part_id, product_id) on public.part_products to anon, authenticated;

-- Anonymous activity and demand.
grant select, insert on public.part_views to anon, authenticated;
grant select, insert on public.part_downloads to anon, authenticated;
grant insert on public.part_requests to anon, authenticated;
grant select, insert on public.feedback to anon, authenticated;

-- Curation, signed-in users only.
grant select, insert on public.curation_rejections to authenticated;

-- User-owned rows.
grant select, insert, update on public.user_profiles to anon, authenticated;
grant select, insert, delete on public.part_likes to anon, authenticated;
grant select, insert, update, delete on public.part_comments to anon, authenticated;
grant select, insert, update, delete on public.collections to anon, authenticated;
grant select, insert, update, delete on public.collection_parts to anon, authenticated;

-- 3. Service role --------------------------------------------------------------

grant select, insert, update, delete on all tables in schema public to service_role;

-- 4. Functions ----------------------------------------------------------------

-- RPC behind the "which product is it?" picker on the zero-result page.
grant execute on function public.search_product_candidates(text, integer) to anon, authenticated, service_role;

-- Search helpers, run as the caller inside `search_all()`,
-- `search_product_candidates()` and the generated columns
-- `product_references.normalized_value` and `search_misses.normalized_query`.
grant execute on function public.fold_search_text(text) to anon, authenticated, service_role;
grant execute on function public.normalize_product_reference(text) to anon, authenticated, service_role;
grant execute on function public.search_token_coverage(text, text[]) to anon, authenticated, service_role;

-- Run as the caller by the `set_product_slug` trigger on product inserts.
grant execute on function public.generate_slug(text) to authenticated, service_role;

-- Called by `refresh_print_report_stats()` (security definer); granted to the
-- service role only, for server-side recomputation.
grant execute on function public.part_product_evidence_level(integer, integer) to service_role;

-- 5. New defaults for tables and sequences ------------------------------------

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
