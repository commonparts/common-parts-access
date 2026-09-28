-- Migration: anonymous view and download rows (issue #324)
--
-- `part_views` stored an unsalted SHA-256 of the visitor's IP address and
-- user agent. An IPv4 hash is reversible by brute force, so it remained
-- personal data. It also stored the raw user agent and, for signed-in
-- visitors, the user id. None of it served a purpose: the 30-minute
-- deduplication that read it back never ran, because only the service role
-- may select from `part_views` and the API reads with the caller's session.
--
-- Views now follow downloads (issue #250): a row carries the part and the
-- moment, nothing about the visitor. It only feeds the trigger that
-- maintains `parts.view_count` (and `parts.download_count`), so both counts
-- keep working unchanged.
--
-- What this migration does, in order:
--
--   1. Drops the insert policies that reference the per-visitor columns.
--      On `part_downloads` this also replaces the permissive policy still
--      live in production: the earlier `anonymous_download_counter`
--      migration shared its version with `flatten_products`, was never
--      applied, and is removed alongside this one.
--   2. Drops `user_id`, `ip_hash` and `user_agent` from both tables. Dropping
--      the columns purges every existing value, including the 122 view rows
--      that held an `ip_hash`; no stored value can recover an IP address.
--   3. Recreates one insert policy per table: anyone, signed in or not, may
--      log a row for a published part. The service-role select policies are
--      unchanged.

-- 1. Policies that depend on the dropped columns ----------------------------

drop policy if exists "Authenticated can insert own views" on public.part_views;
drop policy if exists "Users can log their own downloads" on public.part_downloads;

-- 2. Per-visitor columns ------------------------------------------------------

alter table public.part_views
  drop column user_id,
  drop column ip_hash,
  drop column user_agent;

alter table public.part_downloads
  drop column user_id,
  drop column ip_hash,
  drop column user_agent;

-- 3. Anonymous insert policies ------------------------------------------------

create policy "Anyone can log anonymous views on published parts"
  on public.part_views for insert
  with check (
    exists (
      select 1 from public.parts p
      where p.id = part_id and p.status = 'published'
    )
  );

create policy "Anyone can log anonymous downloads on published parts"
  on public.part_downloads for insert
  with check (
    exists (
      select 1 from public.parts p
      where p.id = part_id and p.status = 'published'
    )
  );
