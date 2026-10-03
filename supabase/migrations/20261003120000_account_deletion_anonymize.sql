-- Migration: account deletion anonymizes instead of failing (issue #178)
--
-- `DELETE /api/users` deletes the auth user, which cascades to
-- `user_profiles`. Five foreign keys to `user_profiles` were
-- `ON DELETE NO ACTION`, so deleting any account that owned a part, a like,
-- a comment, a collection or a curation rejection failed and the route
-- answered 500. This migration gives each of them the behaviour promised in
-- docs/ACCOUNT_DELETION_POLICY.md and on the privacy page:
--
--   parts.user_id                    SET NULL  published parts stay, without an owner
--   part_likes.user_id               SET NULL  likes stay for the counts, anonymized
--   part_comments.user_id            SET NULL  threads stay intact, author anonymized
--   curation_rejections.created_by   SET NULL  the rejection decision stays
--   collections.user_id              CASCADE   collections are deleted
--                                              (collection_parts already cascades)
--
-- SET NULL needs the column to accept null, so NOT NULL is dropped on the
-- four SET NULL columns. Insert policies still require
-- `user_id = auth.uid()` (or `created_by = auth.uid()`), so a signed-in
-- insert can never write a null owner; only an account deletion does.
-- A part with a null owner matches no owner policy: nobody can edit or
-- delete it except through the service role.
--
-- `part_likes` keeps `UNIQUE (user_id, part_id)`: nulls are distinct, so
-- several anonymized likes on one part do not collide. The like counter is
-- maintained by insert/delete triggers, so SET NULL leaves `like_count`
-- unchanged.
--
-- Supabase Auth also refuses to delete a user who owns Storage objects.
-- `release_storage_ownership()` clears `owner` / `owner_id` on that user's
-- objects so the files of their published parts stay served after the
-- account is gone. The API route removes draft files and the avatar through
-- the Storage API first, then calls this function, then deletes the user.

-- 1. Nullable owner columns --------------------------------------------------

alter table public.parts alter column user_id drop not null;
alter table public.part_likes alter column user_id drop not null;
alter table public.part_comments alter column user_id drop not null;
alter table public.curation_rejections alter column created_by drop not null;

-- 2. Foreign key delete actions ----------------------------------------------

alter table public.parts
  drop constraint parts_user_id_fkey,
  add constraint parts_user_id_fkey
    foreign key (user_id) references public.user_profiles (id) on delete set null;

alter table public.part_likes
  drop constraint part_likes_user_id_fkey,
  add constraint part_likes_user_id_fkey
    foreign key (user_id) references public.user_profiles (id) on delete set null;

alter table public.part_comments
  drop constraint part_comments_user_id_fkey,
  add constraint part_comments_user_id_fkey
    foreign key (user_id) references public.user_profiles (id) on delete set null;

alter table public.curation_rejections
  drop constraint curation_rejections_created_by_fkey,
  add constraint curation_rejections_created_by_fkey
    foreign key (created_by) references public.user_profiles (id) on delete set null;

alter table public.collections
  drop constraint collections_user_id_fkey,
  add constraint collections_user_id_fkey
    foreign key (user_id) references public.user_profiles (id) on delete cascade;

-- 3. Storage ownership release -----------------------------------------------

-- Clears the owner of every Storage object the user uploaded and returns how
-- many objects were released. Security definer because `storage.objects` is
-- not writable by the API roles; executable by the service role only, so
-- the account deletion route is the single way in. `owner` is deprecated in
-- favour of `owner_id` (text) but both are still set by Storage, so both are
-- cleared. `storage.objects` has no index on either column; the scan is
-- acceptable at the current object count.
create or replace function public.release_storage_ownership(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  released integer;
begin
  update storage.objects
     set owner = null,
         owner_id = null
   where owner = p_user_id
      or owner_id = p_user_id::text;

  get diagnostics released = row_count;
  return released;
end;
$$;

revoke all on function public.release_storage_ownership(uuid) from public, anon, authenticated;
grant execute on function public.release_storage_ownership(uuid) to service_role;
