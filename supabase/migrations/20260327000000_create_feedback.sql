-- Ensure gen_random_uuid() is available. On Supabase this extension is
-- already present; this is a no-op there, but makes the migration portable
-- to fresh Postgres instances.
create extension if not exists pgcrypto;

create table public.feedback (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),

  -- Qui
  user_id      uuid references public.user_profiles(id) on delete set null,
  email        text check (length(email) <= 255),

  -- Quoi
  type         text not null check (type in ('bug', 'improvement', 'question', 'other')),
  title        text not null check (length(title) <= 200),
  description  text not null check (length(description) <= 5000),

  -- Contexte utile pour les agents
  url          text check (length(url) <= 500),
  user_agent   text check (length(user_agent) <= 500),

  -- Pipeline agent
  status       text not null default 'pending'
                 check (status in ('pending', 'triaged', 'github_issue_created', 'closed')),
  github_issue_url  text,
  github_issue_number integer,
  triage_notes text
);

-- RLS
alter table public.feedback enable row level security;

-- N'importe qui peut soumettre (y compris anonyme)
create policy "Anyone can submit feedback"
  on public.feedback for insert
  with check (true);

-- Seul l'utilisateur peut voir son propre feedback
create policy "Users can view own feedback"
  on public.feedback for select
  using (auth.uid() = user_id);