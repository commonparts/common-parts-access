-- ============================================================================
-- Initial schema migration for Common Parts Access
-- Created: 2026-04-09
--
-- This migration establishes the complete database schema from scratch.
-- It replaces all previous UI-created tables and partial migrations.
-- ============================================================================

-- Extensions
create schema if not exists extensions;
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- ============================================================================
-- Functions (must exist before triggers reference them)
-- ============================================================================

/**
 * Creates a user_profiles row automatically when a new auth.users row is
 * inserted (sign-up). Username falls back to "user_<first-8-chars-of-id>"
 * when the client does not pass one in raw_user_meta_data.
 */
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data->>'display_name'
  );
  return new;
end;
$$;

/**
 * Auto-computes the materialized path and nesting level for categories
 * based on parent_id. Fires BEFORE INSERT OR UPDATE.
 */
create or replace function public.update_category_path()
returns trigger
language plpgsql
as $$
begin
  if new.parent_id is null then
    new.path = '/' || new.slug || '/';
    new.level = 0;
  else
    select path, level + 1
    into new.path, new.level
    from public.categories
    where id = new.parent_id;

    new.path = new.path || new.slug || '/';
  end if;

  return new;
end;
$$;

/** Increments models.like_count when a model_likes row is inserted. */
create or replace function public.increment_model_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.models
     set like_count = coalesce(like_count, 0) + 1
   where id = new.model_id;
  return new;
end;
$$;

/** Decrements models.like_count when a model_likes row is deleted. */
create or replace function public.decrement_model_like_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.models
     set like_count = greatest(coalesce(like_count, 0) - 1, 0)
   where id = old.model_id;
  return old;
end;
$$;

/** Increments models.view_count when a model_views row is inserted. */
create or replace function public.increment_model_view_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.models
     set view_count = coalesce(view_count, 0) + 1
   where id = new.model_id;
  return new;
end;
$$;

/** Increments models.download_count when a model_downloads row is inserted. */
create or replace function public.increment_model_download_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.models
     set download_count = coalesce(download_count, 0) + 1
   where id = new.model_id;
  return new;
end;
$$;

-- ============================================================================
-- Tables (in foreign-key dependency order)
-- ============================================================================

-- user_profiles: extends auth.users with public profile data
create table public.user_profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         text not null unique check (length(username) <= 50),
  display_name     text check (length(display_name) <= 100),
  bio              text,
  avatar_url       text,
  website_url      text,
  location         text check (length(location) <= 100),
  reputation_score integer default 0,
  verified_maker   boolean default false,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- brands
create table public.brands (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique check (length(name) <= 100),
  slug         text not null unique check (length(slug) <= 100),
  description  text,
  logo_url     text,
  website_url  text,
  founded_year integer,
  country      text check (length(country) <= 2),
  verified     boolean default false,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- categories (self-referencing via parent_id)
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(name) <= 100),
  slug        text not null unique check (length(slug) <= 100),
  description text,
  icon        text default 'category-icons/default_icon.png',
  parent_id   uuid references public.categories(id),
  level       integer default 0,
  path        text,
  created_at  timestamptz default now()
);

-- licenses
create table public.licenses (
  id                     uuid primary key default gen_random_uuid(),
  spdx_id                text not null unique,
  name                   text not null,
  short_name             text not null,
  url                    text not null,
  allows_redistribution  boolean not null default true,
  requires_attribution   boolean not null default false,
  allows_commercial      boolean not null default true,
  is_copyleft            boolean not null default false,
  created_at             timestamptz default now()
);

-- products
create table public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(name) <= 200),
  slug         text not null unique check (length(slug) <= 200),
  brand_id     uuid references public.brands(id),
  category_id  uuid references public.categories(id),
  model_number text check (length(model_number) <= 100),
  description  text,
  release_year bigint,
  discontinued boolean default false,
  image_url    text,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- models
create table public.models (
  id                       uuid primary key default gen_random_uuid(),
  name                     text not null check (length(name) <= 200),
  slug                     text not null unique,
  description              text,
  user_id                  uuid not null references public.user_profiles(id),
  product_id               uuid references public.products(id),
  brand_id                 uuid references public.brands(id),
  category_id              uuid references public.categories(id),

  -- Part details
  part_name                text check (length(part_name) <= 200),
  part_number              text check (length(part_number) <= 100),
  material                 text check (length(material) <= 100),
  color                    text check (length(color) <= 50),
  dimensions               jsonb,
  print_settings           jsonb,
  estimated_print_time     bigint,
  estimated_material_usage double precision,

  -- Files and media
  thumbnail_url            text,
  images                   text[],

  -- Status and metrics
  status                   text not null default 'draft'
                             check (status in ('draft', 'published', 'archived')),
  download_count           bigint default 0,
  view_count               bigint default 0,
  like_count               bigint default 0,

  -- Origin tracking
  origin_type              text not null default 'original'
                             check (origin_type in ('original', 'curated', 'manufacturer')),
  source_url               text,
  source_platform          text,
  source_published_at      timestamptz,

  -- Attribution
  original_author          text,
  original_author_url      text,

  -- License
  license_id               uuid references public.licenses(id),
  source_license_id        uuid references public.licenses(id),

  -- Validation
  verification_status      text not null default 'unverified'
                             check (verification_status in ('unverified', 'author_tested', 'community_validated', 'certified')),
  makes_count              integer default 0,

  -- Metadata
  tags                     text[],
  instructions             text,
  notes                    text,

  created_at               timestamptz default now(),
  updated_at               timestamptz default now(),

  -- Curated models must always declare source info
  constraint curated_requires_source check (
    origin_type != 'curated'
    or (
      source_url is not null
      and original_author is not null
      and source_license_id is not null
    )
  )
);

-- model_files
create table public.model_files (
  id                uuid primary key default gen_random_uuid(),
  model_id          uuid references public.models(id) on delete cascade,
  filename          text not null check (length(filename) <= 255),
  original_filename text not null check (length(original_filename) <= 255),
  file_type         text not null check (length(file_type) <= 10),
  file_size         bigint not null,
  file_url          text not null,
  file_category     text not null check (length(file_category) <= 20),
  upload_path       text not null,
  checksum          text check (length(checksum) <= 64),
  created_at        timestamptz default now()
);

-- model_likes
create table public.model_likes (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references public.user_profiles(id),
  model_id uuid not null references public.models(id),
  liked_at timestamptz default now(),
  unique (user_id, model_id)
);

-- model_downloads
create table public.model_downloads (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.user_profiles(id),
  model_id      uuid not null references public.models(id),
  file_id       uuid references public.model_files(id),
  ip_hash       text check (length(ip_hash) <= 64),
  user_agent    text check (length(user_agent) <= 500),
  downloaded_at timestamptz default now()
);
comment on column public.model_downloads.file_id is
  'References a single downloaded file; null for archive downloads containing multiple files.';

-- model_views
create table public.model_views (
  id         uuid primary key default gen_random_uuid(),
  model_id   uuid not null references public.models(id),
  user_id    uuid references auth.users(id),
  ip_hash    text check (length(ip_hash) <= 64),
  user_agent text check (length(user_agent) <= 500),
  viewed_at  timestamptz not null default now()
);

-- model_comments
create table public.model_comments (
  id         uuid primary key default gen_random_uuid(),
  model_id   uuid not null references public.models(id),
  user_id    uuid not null references public.user_profiles(id),
  parent_id  uuid references public.model_comments(id),
  content    text not null,
  rating     integer check (rating >= 1 and rating <= 5),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- collections
create table public.collections (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(name) <= 200),
  description   text,
  user_id       uuid not null references public.user_profiles(id),
  is_public     boolean default true,
  thumbnail_url text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- collection_models (junction table)
create table public.collection_models (
  collection_id uuid not null references public.collections(id) on delete cascade,
  model_id      uuid not null references public.models(id) on delete cascade,
  added_at      timestamptz default now(),
  primary key (collection_id, model_id)
);

-- feedback
create table public.feedback (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  user_id             uuid references public.user_profiles(id) on delete set null,
  email               text check (length(email) <= 255),
  type                text not null check (type in ('bug', 'improvement', 'question', 'other')),
  title               text not null check (length(title) <= 200),
  description         text not null check (length(description) <= 5000),
  url                 text check (length(url) <= 500),
  user_agent          text check (length(user_agent) <= 500),
  status              text not null default 'pending'
                        check (status in ('pending', 'triaged', 'github_issue_created', 'closed')),
  github_issue_url    text,
  github_issue_number integer,
  triage_notes        text
);

-- ============================================================================
-- Indexes
-- ============================================================================

create index idx_categories_path          on public.categories     using btree (path);
create index idx_model_files_model        on public.model_files    using btree (model_id);
create index idx_model_downloads_recent   on public.model_downloads using btree (model_id, downloaded_at desc);
create index idx_models_brand             on public.models         using btree (brand_id);
create index idx_models_category          on public.models         using btree (category_id);
create index idx_models_user              on public.models         using btree (user_id);
create index idx_models_status_created    on public.models         using btree (status, created_at desc);
create index idx_published_models         on public.models         using btree (created_at desc) where (status = 'published');
create unique index idx_models_source_url on public.models         using btree (source_url) where (source_url is not null);
create index idx_models_search            on public.models         using gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- ============================================================================
-- Enable Row Level Security on all tables
-- ============================================================================

alter table public.user_profiles   enable row level security;
alter table public.brands          enable row level security;
alter table public.categories      enable row level security;
alter table public.licenses        enable row level security;
alter table public.products        enable row level security;
alter table public.models          enable row level security;
alter table public.model_files     enable row level security;
alter table public.model_likes     enable row level security;
alter table public.model_downloads enable row level security;
alter table public.model_views     enable row level security;
alter table public.model_comments  enable row level security;
alter table public.collections     enable row level security;
alter table public.collection_models enable row level security;
alter table public.feedback        enable row level security;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- user_profiles ---------------------------------------------------------------
create policy "Users can view all profiles"
  on public.user_profiles for select
  using (true);

create policy "Users can insert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- brands ----------------------------------------------------------------------
create policy "Enable read access for all users"
  on public.brands for select
  using (true);

-- categories ------------------------------------------------------------------
create policy "Categories are publicly readable"
  on public.categories for select
  using (true);

-- licenses --------------------------------------------------------------------
create policy "Licenses are publicly readable"
  on public.licenses for select
  using (true);

-- products --------------------------------------------------------------------
create policy "Products are publicly readable"
  on public.products for select
  using (true);

create policy "Authenticated users can insert products"
  on public.products for insert
  to authenticated
  with check (true);

-- models ----------------------------------------------------------------------
create policy "Anyone can view published models"
  on public.models for select
  using (status = 'published');

create policy "Users can view own models"
  on public.models for select
  using (auth.uid() = user_id);

create policy "Users can manage own models"
  on public.models for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- model_files -----------------------------------------------------------------
create policy "Users can view files of accessible models"
  on public.model_files for select
  using (exists (
    select 1 from public.models m
    where m.id = model_files.model_id
      and (m.status = 'published' or m.user_id = auth.uid())
  ));

create policy "Users can manage files of own models"
  on public.model_files for all
  using (exists (
    select 1 from public.models m
    where m.id = model_files.model_id
      and m.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.models m
    where m.id = model_files.model_id
      and m.user_id = auth.uid()
  ));

-- model_likes -----------------------------------------------------------------
create policy "Users can read own likes"
  on public.model_likes for select
  using (auth.uid() = user_id);

create policy "Service role can read model_likes"
  on public.model_likes for select
  using ((auth.jwt() ->> 'role') = 'service_role');

create policy "Users can insert likes"
  on public.model_likes for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.models m
      where m.id = model_id and m.status = 'published'
    )
  );

create policy "Users can delete own likes"
  on public.model_likes for delete
  using (auth.uid() = user_id);

-- model_downloads -------------------------------------------------------------
create policy "Users can log their own downloads"
  on public.model_downloads for insert
  with check (
    ((auth.uid() is not null and auth.uid() = user_id)
      or (auth.uid() is null and user_id is null))
    and exists (
      select 1 from public.models m
      where m.id = model_id and m.status = 'published'
    )
  );

create policy "Service role can read model_downloads"
  on public.model_downloads for select
  using ((auth.jwt() ->> 'role') = 'service_role');

-- model_comments --------------------------------------------------------------
create policy "Anyone can read comments on published models"
  on public.model_comments for select
  using (exists (
    select 1 from public.models m
    where m.id = model_comments.model_id
      and (m.status = 'published' or m.user_id = auth.uid())
  ));

create policy "Users can insert comments on published models"
  on public.model_comments for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.models m
      where m.id = model_id and m.status = 'published'
    )
  );

create policy "Users can update own comments"
  on public.model_comments for update
  using (auth.uid() = user_id);

create policy "Users can delete own comments"
  on public.model_comments for delete
  using (auth.uid() = user_id);

-- model_views -----------------------------------------------------------------
create policy "Authenticated can insert own views"
  on public.model_views for insert
  with check (
    ((auth.uid() is not null and auth.uid() = user_id)
      or (auth.uid() is null and user_id is null))
    and exists (
      select 1 from public.models m
      where m.id = model_id and m.status = 'published'
    )
  );

create policy "Service role can read model_views"
  on public.model_views for select
  using ((auth.jwt() ->> 'role') = 'service_role');

-- collections -----------------------------------------------------------------
create policy "Public collections are readable by everyone"
  on public.collections for select
  using (is_public = true);

create policy "Users can view own collections"
  on public.collections for select
  using (auth.uid() = user_id);

create policy "Users can manage own collections"
  on public.collections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- collection_models -----------------------------------------------------------
create policy "Collection models are readable for public collections"
  on public.collection_models for select
  using (exists (
    select 1 from public.collections c
    where c.id = collection_models.collection_id
      and (c.is_public = true or c.user_id = auth.uid())
  ));

create policy "Users can manage own collection models"
  on public.collection_models for all
  using (exists (
    select 1 from public.collections c
    where c.id = collection_models.collection_id
      and c.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.collections c
    where c.id = collection_models.collection_id
      and c.user_id = auth.uid()
  ));

-- feedback --------------------------------------------------------------------
create policy "Anyone can submit feedback"
  on public.feedback for insert
  with check (
    (auth.uid() is null and user_id is null)
    or auth.uid() = user_id
  );

create policy "Users can view own feedback"
  on public.feedback for select
  using (auth.uid() = user_id);

-- ============================================================================
-- Triggers
-- ============================================================================

-- Auto-create user_profiles when auth.users row is inserted (sign-up)
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-compute category path and level
create trigger category_path_trigger
  before insert or update on public.categories
  for each row execute function public.update_category_path();

-- Counter triggers
create trigger model_likes_increment
  after insert on public.model_likes
  for each row execute function public.increment_model_like_count();

create trigger model_likes_decrement
  after delete on public.model_likes
  for each row execute function public.decrement_model_like_count();

create trigger model_views_increment
  after insert on public.model_views
  for each row execute function public.increment_model_view_count();

create trigger model_downloads_increment
  after insert on public.model_downloads
  for each row execute function public.increment_model_download_count();

-- ============================================================================
-- MANUAL STEP: Database webhook (not included — contains service role JWT)
-- ============================================================================
-- The on_feedback_insert webhook trigger calls the Edge Function
-- triage-feedback via supabase_functions.http_request(). It requires the
-- service role JWT in the Authorization header, which must NEVER be committed
-- to version control.
--
-- After applying this migration, recreate the webhook manually:
--   Supabase Dashboard > Database > Webhooks > Create new
--     Table:    public.feedback
--     Event:    INSERT
--     Method:   POST
--     URL:      https://<project-ref>.supabase.co/functions/v1/triage-feedback
--     Headers:  Content-type: application/json
--               Authorization: Bearer <SERVICE_ROLE_KEY>
--     Timeout:  5000
-- ============================================================================
