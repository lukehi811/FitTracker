-- FitTracker migration 003: friends (read-only dashboard sharing)
--
-- Run this in the Supabase SQL editor AFTER schema.sql and
-- 002_workout_blocks.sql. Additive — doesn't touch existing tables' data,
-- only adds new SELECT-only policies alongside the existing owner-only ones.
--
-- What this does:
--   1. Adds `email` to `profiles` (needed to look someone up by email when
--      sending a friend request) and backfills it for existing users.
--   2. Creates `friends` (requester_id, addressee_id, status, timestamps)
--      with RLS: see your own rows either direction, insert as requester,
--      update (accept) only as addressee, delete (cancel/decline/unfriend)
--      either direction.
--   3. Adds `is_friends_with(uuid)` — a small helper used by new SELECT-only
--      policies on goals/daily_targets/daily_logs/workout_blocks/
--      daily_workout_completions, so an accepted friend can read your data.
--      All existing INSERT/UPDATE/DELETE policies on those tables are
--      untouched — they stay owner-only. Friends can only ever read.

-- ─────────────────────────────────────────────────────────────────────────
-- profiles: add email (used for "look up by email" when sending a request),
-- and let any authenticated user look up a profile by id/email/display_name
-- — this is what "enter their email to add a friend" needs, and what
-- resolves a friend's display name in the UI.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select using (auth.role() = 'authenticated');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.email
  );

  insert into public.workout_blocks (user_id, day_of_week, title, exercises)
  select new.id, d, 'Rest Day', '[]'::jsonb
  from generate_series(0, 6) as d;

  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- friends
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friends_no_self_friend check (requester_id <> addressee_id)
);

-- one row per unordered pair, regardless of who requested — stops
-- duplicate/mirrored pending requests between the same two people.
create unique index if not exists friends_unique_pair
  on public.friends (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

alter table public.friends enable row level security;

drop policy if exists "friends_select_own" on public.friends;
create policy "friends_select_own" on public.friends
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "friends_insert_as_requester" on public.friends;
create policy "friends_insert_as_requester" on public.friends
  for insert with check (auth.uid() = requester_id);

drop policy if exists "friends_update_as_addressee" on public.friends;
create policy "friends_update_as_addressee" on public.friends
  for update using (auth.uid() = addressee_id) with check (auth.uid() = addressee_id);

-- either side can remove the row: addressee declining a pending request,
-- requester cancelling their own pending request, or either party
-- unfriending later.
drop policy if exists "friends_delete_either_side" on public.friends;
create policy "friends_delete_either_side" on public.friends
  for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ─────────────────────────────────────────────────────────────────────────
-- is_friends_with: true if the caller and `other_user_id` have an accepted
-- friends row, in either direction. security invoker (default) — it queries
-- `friends` under the caller's own RLS, which already scopes rows to ones
-- where the caller is requester or addressee, so this can't leak anyone
-- else's friend connections.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.is_friends_with(other_user_id uuid)
returns boolean
language sql
security invoker
stable
set search_path = public
as $$
  select exists (
    select 1 from public.friends f
    where f.status = 'accepted'
      and (
        (f.requester_id = auth.uid() and f.addressee_id = other_user_id)
        or
        (f.addressee_id = auth.uid() and f.requester_id = other_user_id)
      )
  );
$$;

grant execute on function public.is_friends_with(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Read-only cross-friend access. Each of these is an ADDITIONAL permissive
-- SELECT policy alongside the table's existing owner-only "for all" policy
-- — Postgres ORs permissive policies together, so owners keep full access
-- and friends get read-only access. INSERT/UPDATE/DELETE are still gated
-- solely by the original owner-only policies.
-- ─────────────────────────────────────────────────────────────────────────
drop policy if exists "goals_select_friends" on public.goals;
create policy "goals_select_friends" on public.goals
  for select using (public.is_friends_with(user_id));

drop policy if exists "daily_targets_select_friends" on public.daily_targets;
create policy "daily_targets_select_friends" on public.daily_targets
  for select using (public.is_friends_with(user_id));

drop policy if exists "daily_logs_select_friends" on public.daily_logs;
create policy "daily_logs_select_friends" on public.daily_logs
  for select using (public.is_friends_with(user_id));

drop policy if exists "workout_blocks_select_friends" on public.workout_blocks;
create policy "workout_blocks_select_friends" on public.workout_blocks
  for select using (public.is_friends_with(user_id));

drop policy if exists "daily_workout_completions_select_friends" on public.daily_workout_completions;
create policy "daily_workout_completions_select_friends" on public.daily_workout_completions
  for select using (public.is_friends_with(user_id));
