# FitTracker

A simple, mobile-first workout & diet consistency tracker for two people (Luke & Dallin).

Stack: Next.js 14 (App Router) + TypeScript + Tailwind CSS, Supabase (Auth + Postgres), deployed on Vercel.

## Features

- Email/password login (Supabase Auth) — a plain signup form exists but this is meant for just the two of you
- Personal goal (free text + optional target date)
- Daily targets (water, sleep, protein, calories) with a fast daily log form and progress bars
- Weekly workout planner — name your own days (Push/Pull/Legs/etc. or anything), mark each day done/not done
- Dashboard with today's progress, this week's completion %, and a streak counter

## 1. Create a Supabase project

1. Go to https://supabase.com, create a free account/project.
2. In the project dashboard, go to **Project Settings -> API** and copy:
   - **Project URL**
   - **anon public** key
3. Go to the **SQL Editor**, open a new query, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates all tables (`profiles`, `goals`, `daily_targets`, `daily_logs`, `workout_days`, `workout_completions`), row-level security policies (so each user can only see their own data), and a trigger that auto-creates a `profiles` row on signup.
4. (Recommended, since this app is just for the two of you) In **Authentication -> Providers -> Email**, you can turn **off** "Confirm email" so signup logs straight in without needing to click an email link. If you leave it on, the signup flow will tell you to check your email to confirm before logging in.
5. In **Authentication -> URL Configuration**, set the **Site URL** to your Vercel deployment URL once you have one (e.g. `https://fit-tracker.vercel.app`). This is only needed for the email-confirmation redirect link; local dev works regardless.

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
src/app/(app)/        # authenticated pages: dashboard, goals, daily, workouts (shared nav/header layout)
src/app/login/        # login page + form
src/app/signup/       # signup page + form
src/app/auth/         # Supabase auth callback + signout route handlers
src/lib/actions/      # server actions (form submissions: auth, goals, daily, workouts)
src/lib/supabase/     # Supabase client helpers (browser, server, middleware)
src/components/       # NavBar, ProgressBar
supabase/schema.sql   # full Postgres schema + RLS policies, run once in the Supabase SQL editor
middleware.ts         # keeps Supabase session cookies fresh, redirects unauthenticated users to /login
```

## Notes

- All data access goes through Supabase Row Level Security — every table's policies restrict rows to `auth.uid() = user_id`, so Luke and Dallin only ever see their own data even though they share one Supabase project.
- No charting library — dashboard/stats are plain numbers and CSS progress bars, per the "keep it simple" brief.
- Streak = consecutive scheduled workout days completed, walking backward from today (today doesn't break the streak until the day is over and still unlogged).
