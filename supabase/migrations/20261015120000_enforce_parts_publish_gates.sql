-- Migration: enforce the publish gates of parts in the database (issue #403)
--
-- The two publish gates (`POST /api/upload/drafts/[id]/publish` and
-- `POST /api/curation/drafts/[id]/publish`) are meant to be the only way a
-- part moves from `draft` to `published`. The "Users can manage own parts"
-- RLS policy grants ALL on the owner's rows with no column restriction, so an
-- owner using the public Supabase client could bypass them: publish a draft
-- that fails its gate, claim a trust level (`verification_status`), change
-- `origin_type` (dropping the attribution requirement of
-- `curated_requires_source`), host the files of a curated part (#396), or
-- insert a row that is already published.
--
-- This migration closes those paths without changing the RLS policies:
--
--   1. `parts_curated_link_out` — a curated part is always `link_out`,
--      whatever the caller (#396).
--   2. `parts_guard_owner_writes` — a BEFORE INSERT OR UPDATE trigger that
--      applies to the `anon` and `authenticated` roles only:
--        - on insert, `status` must be `draft` and `verification_status`
--          must be `unverified`;
--        - on update, `status`, `verification_status` and `origin_type`
--          cannot change.
--      The publish gates perform the `draft` -> `published` transition with
--      the service role, after validating the draft.
--
-- How the caller is identified: PostgREST connects as `authenticator`
-- (NOINHERIT) and runs `SET ROLE` to the role of the request JWT (`anon`,
-- `authenticated` or `service_role`). The trigger function is SECURITY
-- INVOKER, so `current_user` is that role. It is not read from the JWT
-- claims, which a maintenance session does not carry. Writes from
-- `service_role`, from migrations and from the dashboard (`postgres`), and
-- from SECURITY DEFINER functions owned by `postgres` (the view, like and
-- print-report counters) are not affected.
--
-- No existing row is affected: at the time of writing every part is
-- `curated` and `link_out`. The migration is idempotent.
--
-- This migration restricts the release in production. The previous release
-- publishes a draft with the user's session, which the trigger refuses.
-- Deploy the code to production before applying it: do not apply it on
-- `dev`; it is applied with the release to `main`. While Railway deploys the
-- release, a publish attempt on the previous release fails with a 500 and
-- can be retried; the draft is unchanged.

-- 1. A curated part is always link_out -----------------------------------

alter table public.parts drop constraint if exists parts_curated_link_out;
alter table public.parts
  add constraint parts_curated_link_out
    check (origin_type <> 'curated' or file_hosting_type = 'link_out');

-- 2. Guard the status and trust columns against owner writes -------------

create or replace function public.guard_parts_owner_writes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Only requests made with the public API keys are restricted. The service
  -- role (publish gates) and maintenance roles write freely.
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status is distinct from 'draft' then
      raise exception 'A part is created as a draft and published through its publish gate'
        using errcode = '42501';
    end if;
    if new.verification_status is distinct from 'unverified' then
      raise exception 'A part is created unverified: verification is granted by the registry'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    raise exception 'The status of a part changes only through its publish gate'
      using errcode = '42501';
  end if;
  if new.verification_status is distinct from old.verification_status then
    raise exception 'The verification status of a part is granted by the registry'
      using errcode = '42501';
  end if;
  if new.origin_type is distinct from old.origin_type then
    raise exception 'The origin type of a part cannot change after creation'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

comment on function public.guard_parts_owner_writes() is
  'Restricts anon and authenticated writes on parts: inserts are unverified drafts; status, verification_status and origin_type cannot change (issue #403).';

drop trigger if exists parts_guard_owner_writes on public.parts;
create trigger parts_guard_owner_writes
  before insert or update on public.parts
  for each row
  execute function public.guard_parts_owner_writes();
