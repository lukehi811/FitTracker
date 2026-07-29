-- FitTracker schema
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query) once,
-- against a fresh Supabase project. Safe to re-run (uses IF NOT EXISTS / OR REPLACE).

-- ─────────────────────────────────────────────────────────────────────────
-- profiles: one row per auth user, created automatically on signup
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- goals: one active goal per user (free text + optional target date)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.goals (
  user_id uuid primary key references auth.users (id) on delete cascade,
  goal_text text not null,
  target_date date,
  updated_at timestamptz not null default now()
);

alter table public.goals enable row level security;

drop policy if exists "goals_all_own" on public.goals;
create policy "goals_all_own" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- daily_targets: one row per user holding their current personal targets
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.daily_targets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  water_oz numeric(6, 1) not null default 64,
  sleep_hours numeric(4, 1) not null default 8,
  protein_g numeric(6, 1) not null default 150,
  calories numeric(6, 0) not null default 2000,
  updated_at timestamptz not null default now()
);

alter table public.daily_targets enable row level security;

drop policy if exists "daily_targets_all_own" on public.daily_targets;
create policy "daily_targets_all_own" on public.daily_targets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- daily_logs: actuals logged per user per calendar day
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  water_oz numeric(6, 1) not null default 0,
  sleep_hours numeric(4, 1) not null default 0,
  protein_g numeric(6, 1) not null default 0,
  calories numeric(6, 0) not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)
);

alter table public.daily_logs enable row level security;

drop policy if exists "daily_logs_all_own" on public.daily_logs;
create policy "daily_logs_all_own" on public.daily_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- workout_days: the weekly plan — one row per user per day-of-week (0=Sun..6=Sat)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.workout_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  name text,
  is_active boolean not null default false,
  unique (user_id, day_of_week)
);

alter table public.workout_days enable row level security;

drop policy if exists "workout_days_all_own" on public.workout_days;
create policy "workout_days_all_own" on public.workout_days
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- workout_completions: a row = that workout day was completed on that date
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.workout_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_day_id uuid not null references public.workout_days (id) on delete cascade,
  completion_date date not null,
  created_at timestamptz not null default now(),
  unique (workout_day_id, completion_date)
);

alter table public.workout_completions enable row level security;

drop policy if exists "workout_completions_all_own" on public.workout_completions;
create policy "workout_completions_all_own" on public.workout_completions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists workout_completions_user_date_idx
  on public.workout_completions (user_id, completion_date);
