import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { toggleWorkoutCompletion } from "@/lib/actions/workouts";
import { ProgressBar } from "@/components/ProgressBar";
import { computeStreak, computeWeeklyCompletion } from "@/lib/streak";
import { isDietDayHit } from "@/lib/diet";
import { isMissingTableError } from "@/lib/errors";
import {
  addDaysToKey,
  currentWeekKeys,
  daysBetweenKeys,
  formatDateKey,
  todayKey,
} from "@/lib/dates";
import { DEFAULT_TARGETS, isBlockScheduled, type DailyValues, type WorkoutBlock } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = todayKey();
  const todayDow = new Date().getDay();
  const historyStart = addDaysToKey(today, -90);
  const weekKeys = currentWeekKeys();
  const weekStart = weekKeys[0];
  const elapsedWeekKeys = weekKeys.filter((k) => k <= today);

  const [
    { data: goal },
    { data: targets },
    { data: todayLog },
    { data: weekLogsRaw },
    { data: blocksRaw, error: blocksError },
    { data: completionsRaw },
  ] = await Promise.all([
    supabase.from("goals").select("goal_text, target_date").eq("user_id", user!.id).maybeSingle(),
    supabase
      .from("daily_targets")
      .select("water_oz, sleep_hours, protein_g, calories")
      .eq("user_id", user!.id)
      .maybeSingle(),
    supabase
      .from("daily_logs")
      .select("water_oz, sleep_hours, protein_g, calories")
      .eq("user_id", user!.id)
      .eq("log_date", today)
      .maybeSingle(),
    supabase
      .from("daily_logs")
      .select("log_date, water_oz, sleep_hours, protein_g, calories")
      .eq("user_id", user!.id)
      .gte("log_date", weekStart)
      .lte("log_date", today),
    supabase
      .from("workout_blocks")
      .select("id, day_of_week, title, exercises")
      .eq("user_id", user!.id),
    supabase
      .from("daily_workout_completions")
      .select("completion_date")
      .eq("user_id", user!.id)
      .gte("completion_date", historyStart),
  ]);

  const t = targets ?? DEFAULT_TARGETS;
  const l = todayLog ?? { water_oz: 0, sleep_hours: 0, protein_g: 0, calories: 0 };
  const blocks: WorkoutBlock[] = blocksRaw ?? [];
  const blocksUnavailable = !!blocksError && !isMissingTableError(blocksError);
  const blocksMigrationPending = isMissingTableError(blocksError);

  const activeDaysOfWeek = new Set(blocks.filter(isBlockScheduled).map((b) => b.day_of_week));
  const completedDateKeys = new Set((completionsRaw ?? []).map((c) => c.completion_date));

  const streak = computeStreak(activeDaysOfWeek, completedDateKeys);
  const { scheduled, completed, pct } = computeWeeklyCompletion(
    weekKeys,
    activeDaysOfWeek,
    completedDateKeys
  );

  const todayBlock = blocks.find((b) => b.day_of_week === todayDow) ?? null;
  const todayIsScheduled = todayBlock ? isBlockScheduled(todayBlock) : false;
  const todayDone = completedDateKeys.has(today);

  const weekLogsByDate = new Map((weekLogsRaw ?? []).map((row) => [row.log_date, row as DailyValues]));
  const dietDaysHit = elapsedWeekKeys.filter((k) => {
    const log = weekLogsByDate.get(k);
    return log ? isDietDayHit(log, t) : false;
  }).length;

  const catchUpDays = Array.from({ length: 7 }, (_, i) => addDaysToKey(today, -(i + 1))).map(
    (dateKey) => {
      const dow = new Date(`${dateKey}T00:00:00`).getDay();
      const block = blocks.find((b) => b.day_of_week === dow) ?? null;
      return {
        dateKey,
        label: formatDateKey(dateKey),
        block,
        isScheduled: block ? isBlockScheduled(block) : false,
        done: completedDateKeys.has(dateKey),
      };
    }
  );

  let countdownText: string | null = null;
  if (goal?.target_date) {
    const days = daysBetweenKeys(today, goal.target_date);
    if (days > 1) countdownText = `${days} days until ${goal.goal_text}`;
    else if (days === 1) countdownText = `1 day until ${goal.goal_text}`;
    else if (days === 0) countdownText = `Today's the day — ${goal.goal_text}`;
    else countdownText = `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} past target date`;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {goal?.goal_text ? (
        <Link href="/goals" className="card block">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Your goal
          </div>
          {countdownText ? (
            <div className="mt-1 text-gray-800">{countdownText}</div>
          ) : (
            <div className="mt-1 text-gray-800">{goal.goal_text}</div>
          )}
        </Link>
      ) : (
        <Link href="/goals" className="card block text-center text-brand-600">
          + Set a goal
        </Link>
      )}

      <div className="card grid grid-cols-2 gap-4 text-center">
        <div>
          <div className="text-3xl font-semibold text-brand-600">{streak}🔥</div>
          <div className="text-sm text-gray-500">day streak</div>
        </div>
        <div>
          <div className="text-3xl font-semibold text-brand-600">{pct}%</div>
          <div className="text-sm text-gray-500">
            this week ({completed}/{scheduled})
          </div>
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-gray-700">Today&rsquo;s workout</h2>
          <Link href="/daily" className="text-sm font-medium text-brand-600">
            Log today
          </Link>
        </div>

        {blocksUnavailable ? (
          <p className="text-sm text-red-600">Couldn&rsquo;t load your workout plan right now.</p>
        ) : blocksMigrationPending ? (
          <p className="text-sm text-amber-600">
            Workout scheduler isn&rsquo;t set up yet — run supabase/migrations/002_workout_blocks.sql.
          </p>
        ) : todayIsScheduled && todayBlock ? (
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-gray-800">{todayBlock.title}</div>
              <div className="text-xs text-gray-500">
                {todayBlock.exercises.length} exercise
                {todayBlock.exercises.length === 1 ? "" : "s"}
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                todayDone ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {todayDone ? "Done ✓" : "Not done yet"}
            </span>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Rest day — no workout scheduled.</p>
        )}
      </div>

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-gray-700">Diet this week</h2>
          <Link href="/daily" className="text-sm font-medium text-brand-600">
            Log today
          </Link>
        </div>

        <p className="text-sm text-gray-500">
          {dietDaysHit} / {elapsedWeekKeys.length} day{elapsedWeekKeys.length === 1 ? "" : "s"} hit
          all targets this week
        </p>

        <div className="space-y-3 border-t border-gray-100 pt-4">
          <ProgressBar label="Water" value={l.water_oz} target={t.water_oz} unit="oz" />
          <ProgressBar label="Sleep" value={l.sleep_hours} target={t.sleep_hours} unit="hrs" />
          <ProgressBar label="Protein" value={l.protein_g} target={t.protein_g} unit="g" />
          <ProgressBar label="Calories" value={l.calories} target={t.calories} unit="cal" />
        </div>
      </div>

      {!blocksUnavailable && !blocksMigrationPending && (
        <details className="card">
          <summary className="cursor-pointer font-medium text-gray-700">
            Catch up on a past day
          </summary>
          <p className="mt-2 text-sm text-gray-500">
            Forgot to mark a workout done? Toggle it here.
          </p>
          <ul className="mt-3 space-y-2">
            {catchUpDays.map((day) => (
              <li
                key={day.dateKey}
                className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-800">{day.label}</div>
                  <div className="truncate text-xs text-gray-500">
                    {day.isScheduled ? day.block?.title : "Rest day"}
                  </div>
                </div>
                {day.isScheduled && (
                  <form action={toggleWorkoutCompletion}>
                    <input type="hidden" name="date" value={day.dateKey} />
                    <button
                      type="submit"
                      className={day.done ? "btn-primary" : "btn-secondary"}
                    >
                      {day.done ? "Done ✓" : "Mark done"}
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
