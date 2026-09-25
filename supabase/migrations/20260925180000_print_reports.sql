-- Migration: one-click print reports (issue #318)
--
-- A print report says whether a printed part worked on one compatible
-- product. Reports are the evidence behind `part_products.evidence_level`
-- (issue #317) and behind `parts.makes_count`.
--
-- What this migration does, in order:
--
--   1. Creates `print_reports`, one row per reporter per part–product pair.
--      Reporting again on the same pair replaces the earlier report instead of
--      adding a vote. The reporter is identified by `reporter_hash`, a SHA-256
--      of a random cookie id (or of the user id when signed in) computed by the
--      API route. No IP address is stored.
--   2. Adds per-result counters on `part_products`. They are server-owned like
--      `evidence_level`: the column grants from #317 only let clients write
--      (part_id, product_id).
--   3. Adds the trigger that recounts a pair after every report change and
--      derives `evidence_level` (through `part_product_evidence_level()`) and
--      `parts.makes_count` from the counts.
--   4. Adds `submit_print_report()`, the only write path. It is executable by
--      the service role only, so the API route (which owns the cookie and the
--      rate limit) cannot be bypassed with the public anon key.
--   5. Drops the unused star rating from `part_comments`.
--
-- Counting rule: `works` and `works_with_adjustments` are positive,
-- `does_not_work` is negative. `makes_count` counts every report, since each
-- one means someone printed the part.
--
-- RLS: enabled with no policy, so `anon` and `authenticated` can neither read
-- nor write the table. Comments are stored but not public; the public page
-- reads the counters on `part_products` instead.
--
-- NOT APPLIED yet: the human applies this migration.

-- 1. The table.
create table public.print_reports (
  id                   uuid primary key default gen_random_uuid(),
  part_id              uuid not null,
  product_id           uuid not null,
  product_reference_id uuid references public.product_references(id) on delete set null,
  result               text not null
                         constraint print_reports_result_check
                         check (result in ('works', 'works_with_adjustments', 'does_not_work')),
  comment              text
                         constraint print_reports_comment_check
                         check (comment is null or char_length(comment) between 1 and 280),
  user_id              uuid references public.user_profiles(id) on delete set null,
  reporter_hash        text not null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- A report is about an existing compatibility; unlinking the product from
  -- the part removes its reports (and the trigger then recounts the part).
  constraint print_reports_part_product_fkey
    foreign key (part_id, product_id)
    references public.part_products(part_id, product_id) on delete cascade,
  constraint print_reports_reporter_part_product_key
    unique (reporter_hash, part_id, product_id)
);

comment on table public.print_reports is
  'Whether a printed part worked on a compatible product; one row per reporter per part–product pair (issue #318).';
comment on column public.print_reports.reporter_hash is
  'SHA-256 of the reporter cookie id or user id, computed by the API route. Never an IP address.';

-- Recounts filter by pair; the unique key above leads with reporter_hash and
-- serves the per-reporter rate limit.
create index print_reports_part_product_idx on public.print_reports (part_id, product_id);

alter table public.print_reports enable row level security;
revoke all on public.print_reports from anon, authenticated;

-- 2. Per-result counters on the compatibility.
alter table public.part_products
  add column works_count                  integer not null default 0,
  add column works_with_adjustments_count integer not null default 0,
  add column does_not_work_count          integer not null default 0;

comment on column public.part_products.works_count is
  'Print reports saying the part works on this product (issue #318). Maintained by trigger.';
comment on column public.part_products.works_with_adjustments_count is
  'Print reports saying the part works after adjustments (issue #318). Maintained by trigger.';
comment on column public.part_products.does_not_work_count is
  'Print reports saying the part does not work on this product (issue #318). Maintained by trigger.';

-- 3. Keep the counters, the evidence level and makes_count in sync.

/**
 * Recounts the reports of one part–product pair and the makes of its part.
 * Recounting (rather than incrementing) keeps the numbers right when a
 * reporter changes their result.
 *
 * The part and link rows are locked (always in that order) before counting.
 * Under READ COMMITTED each count then takes its snapshot after any
 * concurrent report on the same part has committed, instead of two reporters
 * each counting only their own row. NO KEY UPDATE, not UPDATE: the report
 * INSERT already holds KEY SHARE on the link row (foreign key check), which
 * FOR UPDATE would conflict with and deadlock two concurrent reporters.
 */
create or replace function public.refresh_print_report_stats(p_part_id uuid, p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_works         integer;
  v_adjusted      integer;
  v_does_not_work integer;
begin
  -- No-op when the link itself was just deleted (cascade from part_products):
  -- the row is gone, nothing is locked and the UPDATE below matches nothing.
  perform 1 from public.parts where id = p_part_id for no key update;
  perform 1 from public.part_products
   where part_id = p_part_id and product_id = p_product_id
     for no key update;

  select count(*) filter (where result = 'works'),
         count(*) filter (where result = 'works_with_adjustments'),
         count(*) filter (where result = 'does_not_work')
    into v_works, v_adjusted, v_does_not_work
    from public.print_reports
   where part_id = p_part_id
     and product_id = p_product_id;

  update public.part_products
     set works_count                  = v_works,
         works_with_adjustments_count = v_adjusted,
         does_not_work_count          = v_does_not_work,
         evidence_level = public.part_product_evidence_level(v_works + v_adjusted, v_does_not_work)
   where part_id = p_part_id
     and product_id = p_product_id;

  update public.parts
     set makes_count = (select count(*) from public.print_reports where part_id = p_part_id)
   where id = p_part_id;
end;
$$;

create or replace function public.print_reports_refresh_stats()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_print_report_stats(old.part_id, old.product_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE')
     and (tg_op = 'INSERT' or (new.part_id, new.product_id) is distinct from (old.part_id, old.product_id)) then
    perform public.refresh_print_report_stats(new.part_id, new.product_id);
  end if;
  return null;
end;
$$;

create trigger print_reports_refresh_stats
  after insert or update or delete on public.print_reports
  for each row execute function public.print_reports_refresh_stats();

revoke execute on function public.refresh_print_report_stats(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.print_reports_refresh_stats() from public, anon, authenticated;

-- 4. The write path.

/**
 * Records (or replaces) one reporter's print report on a part–product pair and
 * returns the pair's fresh counters. Called by POST /api/print-reports
 * with the service role; the route has already authenticated the optional user
 * and derived the reporter hash from its cookie.
 *
 * Errors (matched by message in the route):
 *   PRINT_REPORT_NOT_FOUND          part not published, or product not linked to it
 *   PRINT_REPORT_INVALID_REFERENCE  reference does not belong to the product
 *   PRINT_REPORT_RATE_LIMITED       reporter touched too many pairs in the last hour
 */
create or replace function public.submit_print_report(
  p_reporter_hash        text,
  p_user_id              uuid,
  p_part_id              uuid,
  p_product_id           uuid,
  p_result               text,
  p_comment              text default null,
  p_product_reference_id uuid default null
)
returns table (
  works_count                  integer,
  works_with_adjustments_count integer,
  does_not_work_count          integer,
  evidence_level               text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Basic abuse protection: at most this many distinct pairs reported (or
  -- re-reported) per reporter per hour. Editing an existing report on the
  -- same pair does not count against it.
  c_max_reports_per_hour constant integer := 20;
  v_comment text := nullif(btrim(p_comment), '');
begin
  -- Serialize one reporter's submissions so two concurrent requests cannot
  -- both pass the rate limit below. Released at commit.
  perform pg_advisory_xact_lock(hashtextextended(p_reporter_hash, 0));

  if not exists (
    select 1
      from public.part_products pp
      join public.parts p on p.id = pp.part_id
     where pp.part_id = p_part_id
       and pp.product_id = p_product_id
       and p.status = 'published'
  ) then
    raise exception 'PRINT_REPORT_NOT_FOUND';
  end if;

  if p_product_reference_id is not null and not exists (
    select 1
      from public.product_references
     where id = p_product_reference_id
       and product_id = p_product_id
  ) then
    raise exception 'PRINT_REPORT_INVALID_REFERENCE';
  end if;

  if (
    select count(*)
      from public.print_reports r
     where r.reporter_hash = p_reporter_hash
       and r.updated_at > now() - interval '1 hour'
       and (r.part_id, r.product_id) is distinct from (p_part_id, p_product_id)
  ) >= c_max_reports_per_hour then
    raise exception 'PRINT_REPORT_RATE_LIMITED';
  end if;

  insert into public.print_reports as r
    (reporter_hash, user_id, part_id, product_id, result, comment, product_reference_id)
  values
    (p_reporter_hash, p_user_id, p_part_id, p_product_id, p_result, v_comment, p_product_reference_id)
  on conflict (reporter_hash, part_id, product_id) do update
    set result               = excluded.result,
        comment              = excluded.comment,
        product_reference_id = excluded.product_reference_id,
        user_id              = coalesce(excluded.user_id, r.user_id),
        updated_at           = now();

  return query
    select pp.works_count, pp.works_with_adjustments_count, pp.does_not_work_count, pp.evidence_level
      from public.part_products pp
     where pp.part_id = p_part_id
       and pp.product_id = p_product_id;
end;
$$;

comment on function public.submit_print_report(text, uuid, uuid, uuid, text, text, uuid) is
  'Records or replaces a print report and returns the pair counters (issue #318). Service role only.';

revoke execute on function public.submit_print_report(text, uuid, uuid, uuid, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.submit_print_report(text, uuid, uuid, uuid, text, text, uuid)
  to service_role;

-- 5. The star rating was never shown; drop it (its check constraint goes with it).
alter table public.part_comments drop column rating;
