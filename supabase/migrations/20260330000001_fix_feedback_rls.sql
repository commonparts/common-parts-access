-- Ensure gen_random_uuid() is available on fresh Postgres instances.
-- On Supabase this extension is already present; this is a no-op there.
create extension if not exists pgcrypto;

-- Tighten the feedback INSERT policy.
-- The original policy used `with check (true)`, which allowed any authenticated
-- client to set user_id to any arbitrary UUID (impersonation / spoofed attribution).
-- The new policy enforces:
--   * anonymous (unauthenticated) submissions must leave user_id NULL
--   * authenticated submissions must set user_id to their own auth.uid()
--   * authenticated users cannot submit anonymously (user_id = NULL is only
--     allowed when auth.uid() IS NULL, i.e. no session at all)
drop policy if exists "Anyone can submit feedback" on public.feedback;

create policy "Anyone can submit feedback"
  on public.feedback for insert
  with check (
    (auth.uid() is null and user_id is null)
    or auth.uid() = user_id
  );
