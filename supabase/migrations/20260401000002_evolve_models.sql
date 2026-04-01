-- Migration: evolve_models
-- Implements the data model evolution described in DATA_MODEL_EVOLUTION.md:
--   1. Add origin tracking, attribution, license FK, and validation columns
--   2. Migrate legacy free-text `license` values to `license_id` references
--   3. Drop the old `license` text column
--   4. Add the `curated_requires_source` constraint
--   5. Add unique index on `source_url`

-- ============================================================================
-- Step 1 — Add new columns (all nullable / have defaults so existing rows pass)
-- ============================================================================

-- Origin tracking
alter table if exists public.models
  add column if not exists origin_type text not null default 'original'
    check (origin_type in ('original', 'curated', 'manufacturer'));

alter table if exists public.models
  add column if not exists source_url text;

alter table if exists public.models
  add column if not exists source_platform text;

alter table if exists public.models
  add column if not exists source_published_at timestamptz;

-- Attribution
alter table if exists public.models
  add column if not exists original_author text;

alter table if exists public.models
  add column if not exists original_author_url text;

-- License foreign keys (nullable until the legacy migration below runs)
alter table if exists public.models
  add column if not exists license_id uuid references public.licenses(id);

alter table if exists public.models
  add column if not exists source_license_id uuid references public.licenses(id);

-- Validation
alter table if exists public.models
  add column if not exists verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'author_tested', 'community_validated', 'certified'));

alter table if exists public.models
  add column if not exists makes_count integer default 0;

-- ============================================================================
-- Step 2 — Migrate legacy free-text license → license_id (best-effort)
-- Wrapped in a DO block so it is safe to run even if the `license` column
-- has already been dropped (e.g. repair runs or environment restores).
-- ============================================================================

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'models'
      and column_name  = 'license'
  ) then

    update public.models
    set license_id = (select id from public.licenses where spdx_id = 'CC0-1.0')
    where lower(license) in ('cc0', 'cc0-1.0', 'cc 0', 'creative commons zero', 'public domain');

    update public.models
    set license_id = (select id from public.licenses where spdx_id = 'CC-BY-4.0')
    where lower(license) in ('cc-by-4.0', 'cc by 4.0', 'cc by', 'creative commons attribution 4.0');

    update public.models
    set license_id = (select id from public.licenses where spdx_id = 'CC-BY-SA-4.0')
    where lower(license) in ('cc-by-sa-4.0', 'cc by-sa 4.0', 'cc by sa 4.0', 'creative commons attribution-sharealike 4.0');

    update public.models
    set license_id = (select id from public.licenses where spdx_id = 'CC-BY-NC-4.0')
    where lower(license) in ('cc-by-nc-4.0', 'cc by-nc 4.0', 'cc by nc 4.0', 'creative commons attribution-noncommercial 4.0');

    update public.models
    set license_id = (select id from public.licenses where spdx_id = 'CC-BY-NC-SA-4.0')
    where lower(license) in ('cc-by-nc-sa-4.0', 'cc by-nc-sa 4.0', 'cc by nc sa 4.0', 'creative commons attribution-noncommercial-sharealike 4.0');

    update public.models
    set license_id = (select id from public.licenses where spdx_id = 'MIT')
    where lower(license) in ('mit', 'mit license', 'mit licence');

    update public.models
    set license_id = (select id from public.licenses where spdx_id = 'GPL-3.0-only')
    where lower(license) in ('gpl-3.0-only', 'gpl-3.0', 'gpl 3.0', 'gnu general public license v3.0');

  end if;
end;
$$ language plpgsql;

-- ============================================================================
-- Step 3 — Drop the legacy free-text license column
-- ============================================================================

alter table if exists public.models drop column if exists license;

-- ============================================================================
-- Step 4 — Add the curated_requires_source constraint
-- Enforces that curated models always declare source_url, original_author,
-- and source_license_id. Applied after the legacy migration so existing rows
-- (all origin_type = 'original') are not affected.
-- ============================================================================

alter table if exists public.models drop constraint if exists curated_requires_source;
alter table if exists public.models
  add constraint curated_requires_source check (
    origin_type != 'curated'
    or (
      source_url is not null
      and original_author is not null
      and source_license_id is not null
    )
  );

-- ============================================================================
-- Step 5 — Unique index on source_url
-- Prevents the same external model from being imported twice.
-- The partial index skips NULL values so original models are unaffected.
-- ============================================================================

create unique index if not exists idx_models_source_url
  on public.models (source_url)
  where source_url is not null;
