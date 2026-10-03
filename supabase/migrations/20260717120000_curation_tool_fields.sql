-- Migration: internal curation tool fields (issue #254)
--
-- Adds what the guided curation flow persists:
--   1. models.needs_* flags        — non-blocking curation flags (Flow P3 §4.3.6);
--      needs_legal_review is the one blocking flag (saved but not publishable)
--      and requires a justification (Flow P3 §4.4).
--   2. models.curation_checklist   — jsonb map of the six blocking criteria of
--      curation checklist v1 (eligibility, product_target, license, file,
--      attribution, duplicate), each true once the curator has verified it.
--   3. curation_rejections         — rejection traceability: a rejected source
--      is recorded with its reason even when no model row was ever created.
--
-- 3MF note: no storage change is needed. The tracked 20260504 migration sets
-- allowed_mime_types on the model-files bucket, but the live bucket has NO
-- MIME allowlist (allowed_mime_types is null, verified 2026-07-17), so
-- model/3mf uploads already pass. Reconciling that drift is out of scope here.
--
-- The publish gate (all six criteria true, no needs_legal_review) is enforced
-- in the application publish endpoint, not in the database — the tool is
-- internal and trusts the operator (Flow P3 §4.2).
--
-- Idempotent-safe where practical. Applied to production via the Supabase MCP
-- on 2026-07-18, on explicit human instruction.

-- ============================================================================
-- 1. Curation flags and checklist state on models
-- ============================================================================

alter table public.models
  add column if not exists needs_verification boolean not null default false,
  add column if not exists needs_print_settings boolean not null default false,
  add column if not exists needs_photo boolean not null default false,
  add column if not exists needs_instructions boolean not null default false,
  add column if not exists needs_category boolean not null default false,
  add column if not exists needs_legal_review boolean not null default false,
  add column if not exists legal_review_justification text,
  add column if not exists curation_checklist jsonb not null default '{}'::jsonb;

comment on column public.models.curation_checklist is
  'Curation checklist v1 blocking criteria as {criterion: boolean}. Keys: eligibility, product_target, license, file, attribution, duplicate. All six must be true to publish a curated part.';
comment on column public.models.needs_legal_review is
  'Blocking flag: the part is saved but not publishable until cleared. Requires legal_review_justification.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'models_legal_review_justification_length'
      and conrelid = 'public.models'::regclass
  ) then
    alter table public.models
      add constraint models_legal_review_justification_length
      check (legal_review_justification is null or length(legal_review_justification) <= 1000);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'models_legal_review_requires_justification'
      and conrelid = 'public.models'::regclass
  ) then
    alter table public.models
      add constraint models_legal_review_requires_justification
      check (not needs_legal_review
             or (legal_review_justification is not null
                 and length(btrim(legal_review_justification)) > 0));
  end if;
end
$$;

-- ============================================================================
-- 2. Rejection traceability
-- ============================================================================

create table if not exists public.curation_rejections (
  id              uuid primary key default gen_random_uuid(),
  source_url      text not null check (length(source_url) <= 2048),
  reason          text not null check (length(btrim(reason)) between 1 and 1000),
  failed_criteria text[] not null default '{}',
  created_by      uuid not null references public.user_profiles(id),
  created_at      timestamptz not null default now()
);

comment on table public.curation_rejections is
  'One row per curation rejection (Flow P3 §4.3.3): which source was rejected, why, and which blocking criteria failed. Exists independently of models so a rejection needs no model row.';

-- Rejections are looked up by source URL when the same source is re-attempted.
create index if not exists idx_curation_rejections_source_url
  on public.curation_rejections (source_url);

alter table public.curation_rejections enable row level security;

-- The curation tool is dashboard-internal but not role-gated in Phase 0
-- (decision 2026-07-17): any authenticated user may record and read
-- rejections. created_by is pinned to the session user.
drop policy if exists "Authenticated can record rejections" on public.curation_rejections;
create policy "Authenticated can record rejections"
  on public.curation_rejections
  for insert to authenticated
  with check (created_by = auth.uid());

drop policy if exists "Authenticated can read rejections" on public.curation_rejections;
create policy "Authenticated can read rejections"
  on public.curation_rejections
  for select to authenticated
  using (true);
