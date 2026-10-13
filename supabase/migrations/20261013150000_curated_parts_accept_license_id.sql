-- Migration: accept license_id as the licence of a curated part (issue #374)
--
-- A part carries one licence: `parts.license_id`. For a part published
-- elsewhere, it records the licence its designer chose at the source.
-- `parts.source_license_id` is removed by the destructive migration
-- 20261013150100_drop_parts_source_license_id.sql, applied with the release.
--
-- Until then, two releases write curated drafts to the same database:
--
--   - the release in production creates a curated draft with
--     `source_license_id` set and `license_id` null;
--   - the release on `dev` and `staging` creates it with `license_id` set and
--     no `source_license_id`.
--
-- The current check `curated_requires_source` requires `source_license_id`
-- and rejects every draft the new release creates. This migration is
-- additive: apply it when the change lands on `dev`.
--
-- What this migration does:
--
--   1. Replaces `curated_requires_source` with a check that accepts either
--      column. Every existing row passes it, since every curated part has
--      `source_license_id` set. The destructive migration narrows it to
--      `license_id`.

alter table public.parts
  drop constraint if exists curated_requires_source;

alter table public.parts
  add constraint curated_requires_source check (
    origin_type <> 'curated'
    or (
      source_url is not null
      and original_author is not null
      and (license_id is not null or source_license_id is not null)
    )
  );
