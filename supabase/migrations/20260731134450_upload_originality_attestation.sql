-- Migration: originality attestation for the public upload flow (issue #293)
--
-- The public flow at /upload publishes one thing only: a part the contributor
-- created themselves, whose files this registry hosts. The contributor's
-- declaration that they hold the rights to publish it is a legal statement,
-- not a UI checkbox, so it is recorded on the row:
--
--   originality_attested     — the declaration was made
--   originality_attested_at  — when it was made
--
-- Deliberately NOT reusing models.curation_checklist: that column records a
-- curator's judgement of someone else's part, which is a different act by a
-- different person. Conflating the two would make neither auditable.
--
-- The publish gate (attested + license + files + product + category) is
-- enforced in the application publish endpoint. The CHECK below only keeps the
-- pair internally consistent, in both directions: the flag and the timestamp
-- are set together or not at all. A timestamp without a flag would date a
-- declaration nobody made, which is the same kind of unsound record the
-- constraint exists to prevent.
--
-- Applied to production via the Supabase MCP on 2026-07-31, on explicit human
-- instruction. Verified after applying: both columns present, the CHECK
-- rejects each inconsistent direction, the index exists, and all 12 existing
-- rows carry the (false, null) default untouched.
--
-- The filename timestamp is the version schema_migrations actually recorded
-- (20260731134450), not the one this file was drafted under: apply_migration
-- stamps its own. They must match, or `supabase db push` reads this as
-- un-applied and runs it again.

alter table public.models
  add column if not exists originality_attested boolean not null default false,
  add column if not exists originality_attested_at timestamptz;

comment on column public.models.originality_attested is
  'Public upload flow (origin_type = original): the contributor declared they created the part and hold the right to publish it under the selected license. Blocking condition of the upload publish gate.';
comment on column public.models.originality_attested_at is
  'Timestamp of the originality declaration. Set together with originality_attested.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'models_originality_attested_requires_timestamp'
      and conrelid = 'public.models'::regclass
  ) then
    alter table public.models
      add constraint models_originality_attested_requires_timestamp
      check (originality_attested = (originality_attested_at is not null));
  end if;
end
$$;

-- The drafts list of the upload flow reads (user_id, origin_type, status)
-- ordered by updated_at — the same access path the curation drafts list uses.
create index if not exists idx_models_owner_origin_status
  on public.models (user_id, origin_type, status, updated_at desc);
