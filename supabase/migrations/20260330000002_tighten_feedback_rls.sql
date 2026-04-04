-- Further tighten the feedback INSERT policy.
-- The previous migration (20260330000001) used `user_id is null or auth.uid() = user_id`,
-- which still allowed authenticated users to insert with user_id = NULL (anonymous attribution).
-- This migration enforces that:
--   * only unauthenticated users (auth.uid() IS NULL) may submit with user_id = NULL
--   * authenticated users must set user_id to their own auth.uid()
drop policy if exists "Anyone can submit feedback" on public.feedback;

create policy "Anyone can submit feedback"
  on public.feedback for insert
  with check (
    (auth.uid() is null and user_id is null)
    or auth.uid() = user_id
  );
