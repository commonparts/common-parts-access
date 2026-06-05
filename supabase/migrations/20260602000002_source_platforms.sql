-- Create source_platforms table to centralise platform metadata.
-- models.source_platform becomes a FK to source_platforms(slug).

create table source_platforms (
  id               uuid        primary key default gen_random_uuid(),
  slug             text        not null unique,
  name             text        not null,
  base_url         text        not null,
  logo_url         text,
  import_supported boolean     not null default false,
  active           boolean     not null default true,
  created_at       timestamptz not null default now()
);

-- Seed with the platforms currently in use.
-- cults3d is included because it exists in the current hardcoded dropdown.
insert into source_platforms (slug, name, base_url, import_supported) values
  ('printables',  'Printables',  'https://www.printables.com',  true),
  ('thingiverse', 'Thingiverse', 'https://www.thingiverse.com', true),
  ('cults3d',     'Cults3D',     'https://cults3d.com',         false),
  ('github',      'GitHub',      'https://github.com',          false),
  ('other',       'Other',       '',                            false);

-- Add FK constraint on models (on update cascade so slug renames propagate).
alter table models
  add constraint models_source_platform_fkey
  foreign key (source_platform)
  references source_platforms(slug)
  on update cascade;

-- RLS — public read only; platforms are managed via SQL, no UI write needed in v1.
alter table source_platforms enable row level security;
create policy "Public read" on source_platforms
  for select using (true);
