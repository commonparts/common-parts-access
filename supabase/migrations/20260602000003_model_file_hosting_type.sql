-- Add file_hosting_type to models.
-- 'hosted'   — file stored in Supabase Storage, downloaded directly from Common Parts Access.
-- 'link_out' — no file hosted; model page shows metadata and redirects to source_url for download.
-- Defaults to 'hosted' so all existing rows remain valid without a backfill.

alter table models
  add column file_hosting_type text not null default 'hosted'
    check (file_hosting_type in ('hosted', 'link_out'));
