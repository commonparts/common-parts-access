-- Migration: create_licenses
-- Creates the normalized licenses reference table to replace the free-text
-- `license` column on `models`. All open-source / Creative Commons licenses
-- used by the curation workflow are seeded here.

create table public.licenses (
  id                     uuid primary key default gen_random_uuid(),
  spdx_id                text not null unique,   -- e.g. "CC0-1.0", "CC-BY-4.0"
  name                   text not null,          -- full legal name
  short_name             text not null,          -- display label, e.g. "CC0"
  url                    text not null,          -- canonical human-readable URL
  allows_redistribution  boolean not null default true,
  requires_attribution   boolean not null default false,
  allows_commercial      boolean not null default true,
  is_copyleft            boolean not null default false,
  created_at             timestamptz default now()
);

-- RLS: reference data — public read, no direct writes (only via migrations)
alter table public.licenses enable row level security;

create policy "Licenses are publicly readable"
  on public.licenses for select
  using (true);

-- Seed data
insert into public.licenses
  (spdx_id, name, short_name, url, allows_redistribution, requires_attribution, allows_commercial, is_copyleft)
values
  (
    'CC0-1.0',
    'Creative Commons Zero v1.0 Universal',
    'CC0',
    'https://creativecommons.org/publicdomain/zero/1.0/',
    true, false, true, false
  ),
  (
    'CC-BY-4.0',
    'Creative Commons Attribution 4.0 International',
    'CC BY 4.0',
    'https://creativecommons.org/licenses/by/4.0/',
    true, true, true, false
  ),
  (
    'CC-BY-SA-4.0',
    'Creative Commons Attribution-ShareAlike 4.0 International',
    'CC BY-SA 4.0',
    'https://creativecommons.org/licenses/by-sa/4.0/',
    true, true, true, true
  ),
  (
    'CC-BY-NC-4.0',
    'Creative Commons Attribution-NonCommercial 4.0 International',
    'CC BY-NC 4.0',
    'https://creativecommons.org/licenses/by-nc/4.0/',
    true, true, false, false
  ),
  (
    'CC-BY-NC-SA-4.0',
    'Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International',
    'CC BY-NC-SA 4.0',
    'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    true, true, false, true
  ),
  (
    'MIT',
    'MIT License',
    'MIT',
    'https://opensource.org/licenses/MIT',
    true, true, true, false
  ),
  (
    'GPL-3.0-only',
    'GNU General Public License v3.0 only',
    'GPL 3.0',
    'https://www.gnu.org/licenses/gpl-3.0.html',
    true, true, true, true
  );
