-- Migration: keep a single licence per part (issue #374)
--
-- A part carried two licence references: `license_id`, the publication
-- licence, and `source_license_id`, the licence at the source. For a design
-- published elsewhere, the only licence that applies is the one its designer
-- chose: the index does not hold the rights and cannot grant different terms.
-- `license_id` is now the licence of the part for every origin type, and
-- `source_license_id` is removed.
--
-- This migration is destructive. The previous release inserts
-- `source_license_id` when it creates a curated draft and selects it on the
-- part page, and PostgREST rejects a request that names a column that does
-- not exist. Deploy the code to production before applying it: it is applied
-- with the release to `main`. It requires
-- 20261013150000_curated_parts_accept_license_id.sql.
--
-- What this migration does, in order:
--
--   1. Copies `source_license_id` into `license_id` where `license_id` is
--      null. The previous release creates a curated draft with the source
--      licence only and sets `license_id` on a later step, so an unfinished
--      draft can lack it.
--   2. Aborts if a row still carries a `source_license_id` that differs from
--      its `license_id`. Such a row needs a decision on which licence
--      applies; none exists at the time of writing.
--   3. Replaces the check `curated_requires_source`: a curated part requires
--      `source_url`, `original_author` and `license_id`.
--   4. Drops the foreign key `parts_source_license_id_fkey`, then the column
--      `parts.source_license_id`.
--
-- No view, index, function or RLS policy references the column.

-- 1. Backfill -----------------------------------------------------------------

update public.parts
set license_id = source_license_id
where license_id is null
  and source_license_id is not null;

-- 2. Guard --------------------------------------------------------------------

do $$
declare
  conflicting integer;
begin
  select count(*) into conflicting
  from public.parts
  where source_license_id is not null
    and license_id is distinct from source_license_id;

  if conflicting > 0 then
    raise exception
      'Aborting: % part(s) carry a source_license_id that differs from license_id. Decide which licence applies to each before dropping the column.',
      conflicting;
  end if;
end
$$;

-- 3. Check constraint -----------------------------------------------------------

alter table public.parts
  drop constraint if exists curated_requires_source;

alter table public.parts
  add constraint curated_requires_source check (
    origin_type <> 'curated'
    or (
      source_url is not null
      and original_author is not null
      and license_id is not null
    )
  );

-- 4. Foreign key and column -----------------------------------------------------

alter table public.parts
  drop constraint if exists parts_source_license_id_fkey;

alter table public.parts
  drop column if exists source_license_id;
