# FitTracker

A simple, mobile-first workout & diet consistency tracker for two people (Luke & Dallin).

Stack: Next.js 14 (App Router) + TypeScript + Tailwind CSS, Supabase (Auth + Postgres), deployed on Vercel.

## Features

- Email/password login (Supabase Auth) — a plain signup form exists but this is meant for just the two of you
- Personal goal (free text + optional target date)
- **Dashboard** — log today's actual water/sleep/protein/calories against your targets (with progress bars), and mark today's assigned workout done/not done, all on one screen
- **Diet** — set your personal daily targets (water, sleep, protein, calories)
- **Workouts** — a drag-and-drop weekly scheduler: 7 blocks (Mon-Sun), each defaulting to "Rest Day." Drag a block to move it to a different day; tap a block to name it (e.g. "Push Day") and add exercises (name/sets/reps)
- Streak counter and this-week completion %, computed from whichever blocks you've renamed off of "Rest Day"

## 1. Create a Supabase project

1. Go to https://supabase.com, create a free account/project.
2. In the project dashboard, go to **Project Settings -> API** and copy:
   - **Project URL**
   - **anon public** key
3. Go to the **SQL Editor**, open a new query, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates the base tables (`profiles`, `goals`, `daily_targets`, `daily_logs`, `workout_days`, `workout_completions`), row-level security policies, and a trigger that auto-creates a `profiles` row on signup.
4. Then open a new query, paste the contents of [`supabase/migrations/002_workout_blocks.sql`](./supabase/migrations/002_workout_blocks.sql), and run it. This adds the `workout_blocks` (drag-and-drop scheduler) and `daily_workout_completions` tables the app now uses instead of `workout_days`/`workout_completions`, backfills 7 default "Rest Day" blocks for Luke & Dallin's existing accounts, and extends the signup trigger so any future account gets the same defaults. It's additive — it doesn't touch or drop the tables from step 3.
5. (Recommended, since this app is just for the two of you) In **Authentication -> Providers -> Email**, you can turn **off** "Confirm email" so signup logs straight in without needing to click an email link. If you leave it on, the signup flow will tell you to check your email to confirm before logging in.
6. In **Authentication -> URL Configuration**, set the **Site URL** to your Vercel deployment URL once you have one (e.g. `https://fit-tracker.vercel.app`). This is only needed for the email-confirmation redirect link; local dev works regardless.

## 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` with the values from step 1.

## 3. Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll land on `/login`. Use the "Create an account" link to sign up as Luke and Dallin (once each).

## 4. Deploy to Vercel

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In Vercel, "Add New Project" -> import `lukehi811/FitTracker`.
3. Add the same two environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) in the Vercel project settings.
4. Deploy. Update the Supabase **Site URL** (Authentication -> URL Configuration) to match your production URL.

## Project structure

```
src/app/(app)/                          # authenticated pages: dashboard, diet, goals, workouts (shared nav/header layout)
src/app/login/                          # login page + form
src/app/signup/                         # signup page + form
src/app/auth/                           # Supabase auth callback + signout route handlers
src/lib/actions/                        # server actions (form submissions + imperative calls: auth, goals, daily, workouts)
src/lib/supabase/                       # Supabase client helpers (browser, server, middleware)
src/components/                         # NavBar, ProgressBar, WorkoutScheduler (drag-and-drop board + block editor modal)
supabase/schema.sql                     # base Postgres schema + RLS policies — run first, once
supabase/migrations/002_workout_blocks.sql  # adds the drag-and-drop scheduler tables — run after schema.sql
src/middleware.ts                       # keeps Supabase session cookies fresh, redirects unauthenticated users to /login
```

## Notes

- All data access goes through Supabase Row Level Security — every table's policies restrict rows to `auth.uid() = user_id`, so Luke and Dallin only ever see their own data even though they share one Supabase project.
- No charting library — dashboard/stats are plain numbers and CSS progress bars, per the "keep it simple" brief.
- Streak = consecutive scheduled workout days completed, walking backward from today (today doesn't break the streak until the day is over and still unlogged). A day counts as "scheduled" if its block's title isn't "Rest Day" — renaming a block off the default is how you mark a day as a workout day.
- Drag-and-drop reordering in Workouts uses [`@dnd-kit`](https://dndkit.com/) and persists via a Postgres RPC (`reorder_workout_blocks`, added in the migration) that reassigns all 7 days in one transaction, so swapping two days never trips a uniqueness error partway through.
