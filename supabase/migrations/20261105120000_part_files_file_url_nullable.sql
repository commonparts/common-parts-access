-- Migration: stop requiring part_files.file_url (issue #56)
--
-- `part_files.file_url` held the full public URL of each file, with the
-- Supabase project host baked into every row. The storage location of a file
-- is already on the row: `upload_path` is its path in the bucket of its
-- `file_category` (`model` -> `model-files`, `image` -> `model-thumbnails`).
-- The application now reads and writes `upload_path` only, and resolves public
-- URLs at the API boundary.
--
-- What this migration does:
--
--   Drops the NOT NULL constraint on `part_files.file_url`, so the rows the
--   application now inserts without it are accepted.
--
-- Why it is applied when the PR lands on `dev`: there is one database behind
-- every environment. The code on `dev` inserts rows without `file_url` as soon
-- as it runs, so the constraint must be gone first. The release in production
-- still writes `file_url` on every insert, which a nullable column accepts, so
-- this change cannot break it.
--
-- The column itself is dropped by a later migration, once no release in
-- production reads or writes it.
--
-- No index, RLS policy or grant changes: the column keeps its type and the
-- table keeps its policies and privileges.

alter table public.part_files
  alter column file_url drop not null;

comment on column public.part_files.file_url is
  'Deprecated (#56): no longer written or read. The storage location of a file is upload_path, in the bucket of its file_category.';
