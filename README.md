# FitTracker

A simple, mobile-first workout & diet consistency tracker for two people (Luke & Dallin).

Stack: Next.js 14 (App Router) + TypeScript + Tailwind CSS, Supabase (Auth + Postgres), deployed on Vercel.

## Features

- Email/password login (Supabase Auth) — a plain signup form exists but this is meant for just the two of you
- **Dashboard** — read-only summary: goal + countdown to its target date, current streak, this week's workout completion %, diet-target-hit count for the week so far, today's diet progress bars, today's workout status, and a "catch up on a past day" toggle for retroactively marking a missed workout done
- **Daily** — same-day data entry: log today's water/sleep/protein/calories against your targets, check off today's assigned workout's exercises as you go (a personal checklist, not synced anywhere), and a "Mark day done" toggle that's what actually counts toward your streak/completion %
- **Diet** — set your personal daily targets (water, sleep, protein, calories) — targets only, no logging here
- **Workouts** — a drag-and-drop weekly scheduler: 7 blocks (Mon-Sun), each defaulting to "Rest Day." Drag a block to move it to a different day; tap a block to name it (e.g. "Push Day") and add exercises (name/sets/reps)
- **Goals** — free-text end goal + optional target date
- **Friends** (linked from the header) — send a request by email, accept/decline, and once accepted, view a friend's dashboard read-only (their goal/countdown, today's diet vs targets, this week's completion %, streak). No edit access to anything of theirs, ever.
- **Stats** (linked from the Dashboard) — month-by-month workout completion % and diet-target-hit %, going back as far as you have data

## 1. Create a Supabase project

1. Go to https://supabase.com, create a free account/project.
2. In the project dashboard, go to **Project Settings -> API** and copy:
   - **Project URL**
   - **anon public** key
3. Run these three files **in order**, each as a new query in the **SQL Editor**:
   1. [`supabase/schema.sql`](./supabase/schema.sql) — base tables (`profiles`, `goals`, `daily_targets`, `daily_logs`, `workout_days`, `workout_completions`), RLS, and the new-user trigger.
   2. [`supabase/migrations/002_workout_blocks.sql`](./supabase/migrations/002_workout_blocks.sql) — adds `workout_blocks` (drag-and-drop scheduler) and `daily_workout_completions`, which the app uses instead of `workout_days`/`workout_completions`. Backfills 7 default "Rest Day" blocks for any existing accounts and extends the signup trigger for future ones.
   3. [`supabase/migrations/003_friends.sql`](./supabase/migrations/003_friends.sql) — adds the `friends` table and read-only cross-friend access to goals/targets/logs/workouts. Adds `email` to `profiles` (needed to look someone up when sending a request) and backfills it.
   
   Each file is additive — none of them drop or rewrite what came before, so it's safe to run them once, in order, against your live project.
4. (Recommended, since this app is just for the two of you) In **Authentication -> Providers -> Email**, you can turn **off** "Confirm email" so signup logs straight in without needing to click an email link. If you leave it on, the signup flow will tell you to check your email to confirm before logging in.
5. In **Authentication -> URL Configuration**, set the **Site URL** to your Vercel deployment URL once you have one (e.g. `https://fit-tracker.vercel.app`). This is only needed for the email-confirmation redirect link; local dev works regardless.

If something looks broken after running a migration (e.g. a page shows no data), `npm run diagnose:workouts` (see below) is a good first check.

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

## Diagnostics

`scripts/check-workout-blocks.mjs` is a standalone script (uses your Supabase **service role** key, not the app's anon key, so it bypasses RLS and shows the true state of the table) that checks whether `workout_blocks` exists and whether each signed-up user actually has their 7 rows. Useful any time a page looks like it's missing data and you want to rule out "the migration wasn't run" before digging further:

```bash
SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... npm run diagnose:workouts
```

Never put the service role key in `.env.local` or commit it anywhere.

## Project structure

```
src/app/(app)/                              # authenticated pages: dashboard, daily, diet, goals, workouts, friends, stats (shared nav/header layout)
src/app/login/                              # login page + form
src/app/signup/                             # signup page + form
src/app/auth/                               # Supabase auth callback + signout route handlers
src/lib/actions/                            # server actions (form submissions + imperative calls: auth, goals, daily, workouts, friends)
src/lib/supabase/                           # Supabase client helpers (browser, server, middleware)
src/lib/dashboardStats.ts                   # shared stats computation — used by both the owner's Dashboard and the read-only friend view
src/lib/monthlyStats.ts                     # month-by-month workout/diet consistency computation, used by Stats
src/components/                             # NavBar, ProgressBar, WorkoutScheduler (drag-and-drop board + block editor modal), ExerciseChecklist
supabase/schema.sql                         # base Postgres schema + RLS policies — run first, once
supabase/migrations/002_workout_blocks.sql  # adds the drag-and-drop scheduler tables — run after schema.sql
supabase/migrations/003_friends.sql         # adds friends + read-only cross-friend access — run after 002
scripts/check-workout-blocks.mjs            # standalone diagnostic, see "Diagnostics" above
src/middleware.ts                           # keeps Supabase session cookies fresh, redirects unauthenticated users to /login
```

## Notes

- All data access goes through Supabase Row Level Security. Every table's base policy restricts rows to `auth.uid() = user_id`; the friends migration adds an *additional* read-only policy so an accepted friend can also `SELECT` (never insert/update/delete) your goals/targets/logs/workouts. Luke and Dallin never see anything of each other's beyond what's explicitly shared through an accepted friend request.
- No charting library anywhere — dashboard/stats are plain numbers, CSS progress bars, and simple lists, per the "keep it simple" brief.
- Streak = consecutive scheduled workout days completed, walking backward from today (today doesn't break the streak until the day is over and still unlogged). A day counts as "scheduled" if its block's title isn't "Rest Day" — renaming a block off the default is how you mark a day as a workout day.
- A day "hits" its diet targets when every logged value (water/sleep/protein/calories) meets or exceeds its target — used for both the Dashboard's weekly count and the Stats page's monthly %.
- Drag-and-drop reordering in Workouts uses [`@dnd-kit`](https://dndkit.com/) and persists via a Postgres RPC (`reorder_workout_blocks`, added in migration 002) that reassigns all 7 days in one transaction, so swapping two days never trips a uniqueness error partway through.
- The exercise checklist on Daily is stored in the browser's `localStorage` only, keyed by user/date/block — it's a personal "check off as you go" aid, not synced to the database or visible to friends.
