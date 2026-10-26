-- Migration: restrict function grants and fix search paths (issue #435)
--
-- The Supabase security advisor reports functions in `public` that the Data
-- API (`/rest/v1/rpc/`) lets roles execute although they never call them, and
-- functions without a fixed `search_path`. This migration grants each function
-- only to the roles that call it, as `CLAUDE.md` requires.
--
--   1. Trigger functions: EXECUTE is revoked from `public`, `anon` and
--      `authenticated`. A trigger function's EXECUTE privilege is checked when
--      the trigger is created, not when it fires, so the view and like
--      counters and the profile created on sign-up keep working.
--   2. `update_category_path()`, `generate_slug(text)` and `set_product_slug()`
--      get `search_path = ''`. The first two already reference only
--      schema-qualified tables and `pg_catalog` built-ins, which stay
--      reachable with an empty search path; `set_product_slug()` is redefined
--      to call `public.generate_slug()` by its qualified name. Its body is
--      otherwise the definition read from the database on 2026-10-26.
--   3. `fetch_part_request_counts()` stays executable by `anon` and
--      `authenticated`: the public product page lists open requests with it
--      for every visitor. It returns aggregates only. The implicit grant to
--      `public` is replaced by explicit grants to the three roles that call it.
--
-- The curation RPCs `fetch_top_search_misses()` and
-- `fetch_pending_product_references()` keep their `authenticated` grant here:
-- the release in production still calls them as the signed-in user. The code
-- of this change calls them with the service role behind a curator check, and
-- the grant is revoked by a follow-up migration once that code is in
-- production (see `docs/DEV_STRATEGY.md`, Follow-up PRs).
--
-- Every statement is a REVOKE, a GRANT or a function redefinition with the
-- same signature, so the migration is additive and idempotent.

-- 1. Trigger functions ---------------------------------------------------------

-- `part_views_increment` on `part_views`.
revoke execute on function public.increment_part_view_count() from public, anon, authenticated;
-- `part_likes_increment` and `part_likes_decrement` on `part_likes`.
revoke execute on function public.increment_part_like_count() from public, anon, authenticated;
revoke execute on function public.decrement_part_like_count() from public, anon, authenticated;
-- `on_auth_user_created` on `auth.users`.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 2. Fixed search paths ----------------------------------------------------------

-- `category_path_trigger` on `categories`; reads `public.categories` only.
alter function public.update_category_path() set search_path = '';

-- Uses `lower`, `translate`, `regexp_replace` and `trim` from `pg_catalog`.
alter function public.generate_slug(text) set search_path = '';

-- `product_slug_trigger` on `products`. CREATE OR REPLACE keeps the owner, the
-- grants and the trigger.
create or replace function public.set_product_slug()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  base_slug  text;
  candidate  text;
  counter    int := 2;
begin
  -- Slug explicitly provided and changed by the user → keep it.
  if new.slug is not null and new.slug <> '' and (tg_op = 'UPDATE' and new.slug <> old.slug) then
    return new;
  end if;

  if new.slug is null or new.slug = '' then
    base_slug := public.generate_slug(new.name);

    candidate := base_slug;
    while exists (
      select 1 from public.products
      where slug = candidate
        and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) loop
      candidate := base_slug || '-' || counter;
      counter   := counter + 1;
    end loop;

    new.slug := candidate;
  end if;

  -- Regenerate when name changes without a manual slug edit.
  if tg_op = 'UPDATE'
    and new.slug = old.slug
    and new.name is distinct from old.name then

    counter := 2;
    base_slug := public.generate_slug(new.name);

    candidate := base_slug;
    while exists (
      select 1 from public.products
      where slug = candidate and id <> new.id
    ) loop
      candidate := base_slug || '-' || counter;
      counter   := counter + 1;
    end loop;

    new.slug := candidate;
  end if;

  return new;
end;
$function$;

-- 3. Open part-request counts: public by design ----------------------------------

revoke execute on function public.fetch_part_request_counts(uuid) from public;
grant execute on function public.fetch_part_request_counts(uuid) to anon, authenticated, service_role;
