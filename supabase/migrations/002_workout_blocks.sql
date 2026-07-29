-- FitTracker migration 002: drag-and-drop workout scheduler
--
-- Run this in the Supabase SQL editor (Project -> SQL Editor -> New query)
-- AFTER you've already run supabase/schema.sql. This is additive/idempotent:
-- it does not touch or drop the existing `workout_days` / `workout_completions`
-- tables, it only adds two new tables the app now uses instead.
--
-- What this does:
--   1. Creates `workout_blocks` — one row per user per day-of-week (0=Sun..6=Sat),
--      holding a title (default 'Rest Day') and a jsonb list of exercises
--      ({name, sets, reps}). This replaces `workout_days` as the source of
--      truth for the weekly plan.
--   2. Creates `daily_workout_completions` — one row per user per calendar
--      date that was marked done. Replaces `workout_completions`.
--   3. Adds a `reorder_workout_blocks` function the app calls (via RPC) to
--      atomically reassign which block sits on which day when you drag to
--      reorder — this avoids transient unique-constraint conflicts when
--      swapping two days' assignments in one action.
--   4. Backfills 7 default "Rest Day" blocks for every existing user
--      (Luke & Dallin), and extends the existing new-user trigger so future
--      signups get the same 7 defaults automatically.

-- ─────────────────────────────────────────────────────────────────────────
-- workout_blocks
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.workout_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  title text not null default 'Rest Day',
  exercises jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  -- deferrable so a same-transaction reorder (see reorder_workout_blocks
  -- below) can swap two blocks' day_of_week values without transiently
  -- violating uniqueness mid-transaction.
  constraint workout_blocks_user_day_unique
    unique (user_id, day_of_week) deferrable initially deferred
);

alter table public.workout_blocks enable row level security;

drop policy if exists "workout_blocks_all_own" on public.workout_blocks;
create policy "workout_blocks_all_own" on public.workout_blocks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- daily_workout_completions
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.daily_workout_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  completion_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, completion_date)
);

alter table public.daily_workout_completions enable row level security;

drop policy if exists "daily_workout_completions_all_own" on public.daily_workout_completions;
create policy "daily_workout_completions_all_own" on public.daily_workout_completions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists daily_workout_completions_user_date_idx
  on public.daily_workout_completions (user_id, completion_date);

-- ─────────────────────────────────────────────────────────────────────────
-- reorder_workout_blocks: atomically reassign day_of_week for up to 7 blocks
-- in one transaction, so drag-and-drop swaps never hit a uniqueness error
-- partway through. Runs with the caller's own privileges (not security
-- definer) so the existing RLS policy above still governs every row it
-- touches.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.reorder_workout_blocks(p_ids uuid[], p_days smallint[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  i int;
begin
  if p_ids is null or p_days is null
     or array_length(p_ids, 1) is distinct from array_length(p_days, 1) then
    raise exception 'p_ids and p_days must be the same non-null length';
  end if;

  for i in 1 .. array_length(p_ids, 1) loop
    update public.workout_blocks
    set day_of_week = p_days[i],
        updated_at = now()
    where id = p_ids[i]
      and user_id = auth.uid();
  end loop;
end;
$$;

grant execute on function public.reorder_workout_blocks(uuid[], smallint[]) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Backfill: give every existing user 7 default blocks (idempotent — safe
-- to re-run, WHERE NOT EXISTS skips users who already have them).
--
-- This can't use `ON CONFLICT (user_id, day_of_week) DO NOTHING`: that
-- constraint is declared DEFERRABLE (see workout_blocks_user_day_unique
-- above, needed so reorder_workout_blocks can swap two days in one
-- transaction), and Postgres does not allow ON CONFLICT to target a
-- deferrable unique constraint as its arbiter — "ON CONFLICT does not
-- support deferrable unique constraints/exclusion constraints as
-- arbiters". WHERE NOT EXISTS gets the same "insert only if missing"
-- behavior without needing an arbiter at all.
-- ─────────────────────────────────────────────────────────────────────────
insert into public.workout_blocks (user_id, day_of_week, title, exercises)
select u.id, d.day_of_week, 'Rest Day', '[]'::jsonb
from auth.users u
cross join generate_series(0, 6) as d(day_of_week)
where not exists (
  select 1 from public.workout_blocks wb
  where wb.user_id = u.id and wb.day_of_week = d.day_of_week
);

-- ─────────────────────────────────────────────────────────────────────────
-- Extend the existing new-user trigger function so future signups also get
-- 7 default blocks seeded automatically. This replaces the function body
-- from supabase/schema.sql; the trigger itself (on_auth_user_created) is
-- untouched and keeps pointing at this same function name.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));

  insert into public.workout_blocks (user_id, day_of_week, title, exercises)
  select new.id, d, 'Rest Day', '[]'::jsonb
  from generate_series(0, 6) as d;

  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Optional cleanup (NOT run automatically): the app no longer reads or
-- writes `workout_days` / `workout_completions` after this migration. They
-- are left in place untouched so nothing here is destructive. If you want
-- to drop them once you've confirmed the new scheduler works, run:
--
--   drop table if exists public.workout_completions;
--   drop table if exists public.workout_days;
-- ─────────────────────────────────────────────────────────────────────────
