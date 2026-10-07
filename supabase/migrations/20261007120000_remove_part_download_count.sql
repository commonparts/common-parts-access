-- Migration: remove the part download counter (issue #373)
--
-- Every published part keeps its files at the source, so nothing is
-- downloaded from Common Parts Access and `parts.download_count` is 0 on all
-- parts but one. The counter only ordered the browse page, the home page
-- section and the product page, and made those orderings arbitrary. The
-- application no longer reads it: deploy the code before applying this
-- migration, as the previous release selects and orders by the column.
--
-- Download events for hosted files stay recorded in `part_downloads`. If a
-- public figure is needed once hosted parts exist, it will be derived from
-- those rows.
--
-- What this migration does, in order:
--
--   1. Drops the trigger that incremented the counter on every insert into
--      `part_downloads`, then the trigger function.
--   2. Drops `parts.download_count`.
--
-- `part_downloads`, its RLS policies and its insert path are unchanged: a
-- download still inserts one row and returns no error.

-- 1. Trigger and trigger function -------------------------------------------

drop trigger if exists part_downloads_increment on public.part_downloads;
drop function if exists public.increment_part_download_count();

-- 2. Counter column -----------------------------------------------------------

alter table public.parts drop column if exists download_count;
