-- CR Pay cloud store: one JSON snapshot per signed-in user.
-- Paste this into the Supabase SQL editor (Project → SQL → New query).

create table if not exists public.pay_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.pay_state enable row level security;

drop policy if exists "own pay state" on public.pay_state;

create policy "own pay state"
  on public.pay_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
