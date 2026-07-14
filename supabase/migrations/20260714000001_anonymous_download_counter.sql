-- Anonymous download counter (issue #250).
-- Downloads no longer carry any individual data: no user_id, no ip_hash,
-- no user_agent. A model_downloads row only feeds the download_count
-- trigger. The insert policy therefore accepts anonymous rows from any
-- caller (authenticated or not) on published models, and rejects rows
-- that still try to record identifying fields.
-- Existing columns are kept for now so historical rows stay intact;
-- dropping them can be a follow-up once analytics no longer read them.

drop policy "Users can log their own downloads" on public.model_downloads;

create policy "Anyone can log anonymous downloads on published models"
  on public.model_downloads for insert
  with check (
    user_id is null
    and ip_hash is null
    and user_agent is null
    and exists (
      select 1 from public.models m
      where m.id = model_id and m.status = 'published'
    )
  );
