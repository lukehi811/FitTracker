-- FitTracker migration 004: workout completion snapshots
--
-- Run this in the Supabase SQL editor AFTER schema.sql, 002, and 003.
-- Purely additive: adds three nullable columns to daily_workout_completions.
-- Doesn't touch, drop, or rewrite anything else.
--
-- Why: "what workout did I do on day X" used to be answered by looking up
-- whichever block CURRENTLY sits on that weekday in workout_blocks — but
-- blocks get renamed and dragged to different days over time, so a
-- completed day's history could silently show the wrong workout later.
-- These columns let the app snapshot the block's title, its exercise list,
-- and which exercises were checked off, AT THE MOMENT a day is marked
-- done, so the record is frozen and stays accurate regardless of later
-- schedule changes.
--
-- Existing rows (completed before this migration) will have NULL in all
-- three columns — the app treats that as "no detailed record for this
-- entry" rather than guessing or falling back to current (possibly wrong)
-- schedule data.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.daily_workout_completions
  add column if not exists block_title text,
  add column if not exists exercises jsonb,
  add column if not exists checked_exercises jsonb;

comment on column public.daily_workout_completions.block_title is
  'Snapshot of the workout block''s title at the moment this day was marked done. NULL for rows that predate this column (no detailed record).';

comment on column public.daily_workout_completions.exercises is
  'Snapshot of the block''s exercises ([{name,sets,reps}, ...]) at the moment this day was marked done. NULL for rows that predate this column.';

comment on column public.daily_workout_completions.checked_exercises is
  'Indices into the `exercises` snapshot that were checked off. NULL means either no per-exercise tracking happened for this entry (e.g. marked done via the retroactive catch-up control, which has no checklist to read from) or this row predates snapshotting entirely.';
