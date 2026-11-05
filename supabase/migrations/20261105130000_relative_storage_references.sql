-- Migration: store relative storage references, drop part_files.file_url (issue #56)
--
-- Storage references were stored as full public URLs
-- (`https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>`),
-- which bakes the Supabase project host into every row: moving to another
-- project or a custom storage domain would break all of them. The application
-- now stores relative references (`<bucket>/<path>`) and resolves them to
-- public URLs at the API boundary (`resolveStorageUrl()`).
--
-- What this migration does:
--
--   1. Rewrites every stored Supabase public object URL that points into one
--      of the application's buckets to its relative reference, in
--      `parts.thumbnail_url`, `parts.images`, `products.image_url`,
--      `user_profiles.avatar_url` and `collections.thumbnail_url`. A value
--      that is not such a URL (an external avatar, an already relative
--      reference, null) is left unchanged, so the migration is idempotent.
--      Only rows that change are updated.
--
--   2. Drops `part_files.file_url`. The storage location of a file is
--      `upload_path`, in the bucket of its `file_category`. The column has been
--      nullable, unread and unwritten since
--      20261105101644_part_files_file_url_nullable.sql.
--
-- Why it is applied when the release is merged into `main`: there is one
-- database behind every environment. Step 1 needs a release in production that
-- resolves relative references, and step 2 needs one that no longer writes
-- `file_url`. The release before this one does both (#56, first step), so this
-- migration ships in the release after it and is applied automatically when
-- that release is merged into `main`.
--
-- Triggers: `parts_guard_owner_writes` lets maintenance roles write freely,
-- and `parts_status_parts_count` fires on status changes only. No table here
-- has an `updated_at` trigger, so `updated_at` is unchanged.
--
-- No index, RLS policy or grant changes. No function reads `part_files.file_url`;
-- `search_all` returns `thumbnail_url` and `image_url` as stored, and
-- `searchAll()` resolves them.
--
-- Checked on production data before writing: every one of the 76 thumbnails
-- and 307 gallery entries converts, and every registered image file is
-- `model-thumbnails/<upload_path>` in its part's converted gallery.

-- A Supabase public object URL into one of the application's buckets. The
-- capture group is the relative reference: `<bucket>/`, then the path.
create function pg_temp.to_storage_reference(value text)
returns text
language sql
immutable
as $$
  select regexp_replace(
    value,
    '^https?://[^/]+/storage/v1/object/public/((model-files|model-thumbnails|product-thumbnails|user-avatars|brand-assets|category-icons)/)',
    '\1'
  )
$$;

update public.parts
set
  thumbnail_url = pg_temp.to_storage_reference(thumbnail_url),
  -- Order kept; a null gallery stays null (array() over no rows is '{}').
  images = case
    when images is null then null
    else array(
      select pg_temp.to_storage_reference(image)
      from unnest(images) with ordinality as gallery(image, position)
      order by position
    )
  end
where thumbnail_url is distinct from pg_temp.to_storage_reference(thumbnail_url)
   or exists (select 1 from unnest(images) as image where image is distinct from pg_temp.to_storage_reference(image));

update public.products
set image_url = pg_temp.to_storage_reference(image_url)
where image_url is distinct from pg_temp.to_storage_reference(image_url);

update public.user_profiles
set avatar_url = pg_temp.to_storage_reference(avatar_url)
where avatar_url is distinct from pg_temp.to_storage_reference(avatar_url);

update public.collections
set thumbnail_url = pg_temp.to_storage_reference(thumbnail_url)
where thumbnail_url is distinct from pg_temp.to_storage_reference(thumbnail_url);

alter table public.part_files
  drop column file_url;
