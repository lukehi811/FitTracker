import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { toggleWorkoutCompletion } from "@/lib/actions/workouts";
import { ProgressBar } from "@/components/ProgressBar";
import { getDashboardStats } from "@/lib/dashboardStats";
import { addDaysToKey, formatDateKey, todayKey } from "@/lib/dates";
import { isBlockScheduled } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const stats = await getDashboardStats(supabase, user!.id);
  const today = todayKey();

  const catchUpDays = Array.from({ length: 7 }, (_, i) => addDaysToKey(today, -(i + 1))).map(
    (dateKey) => {
      const dow = new Date(`${dateKey}T00:00:00`).getDay();
      const block = stats.blocks.find((b) => b.day_of_week === dow) ?? null;
      return {
        dateKey,
        label: formatDateKey(dateKey),
        block,
        isScheduled: block ? isBlockScheduled(block) : false,
        done: stats.completedDateKeys.has(dateKey),
      };
    }
  );

  const { scheduled, completed, pct } = stats.weeklyCompletion;

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

      {stats.goal?.goal_text ? (
        <Link href="/goals" className="card block">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Your goal
          </div>
          <div className="mt-1 text-gray-800">{stats.countdownText ?? stats.goal.goal_text}</div>
        </Link>
      ) : (
        <Link href="/goals" className="card block text-center text-brand-600">
          + Set a goal
        </Link>
      )}

      <div className="card grid grid-cols-2 gap-4 text-center">
        <div>
          <div className="text-3xl font-semibold text-brand-600">{stats.streak}🔥</div>
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

        {stats.blocksError ? (
          <p className="text-sm text-red-600">Couldn&rsquo;t load your workout plan right now.</p>
        ) : stats.blocksMigrationPending ? (
          <p className="text-sm text-amber-600">
            Workout scheduler isn&rsquo;t set up yet — run supabase/migrations/002_workout_blocks.sql.
          </p>
        ) : stats.todayIsScheduled && stats.todayBlock ? (
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-gray-800">
                {stats.todayBlock.title}
              </div>
              <div className="text-xs text-gray-500">
                {stats.todayBlock.exercises.length} exercise
                {stats.todayBlock.exercises.length === 1 ? "" : "s"}
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                stats.todayDone ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {stats.todayDone ? "Done ✓" : "Not done yet"}
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
          {stats.dietDaysHit} / {stats.elapsedWeekDays} day{stats.elapsedWeekDays === 1 ? "" : "s"}{" "}
          hit all targets this week
        </p>

        <div className="space-y-3 border-t border-gray-100 pt-4">
          <ProgressBar
            label="Water"
            value={stats.todayLog.water_oz}
            target={stats.targets.water_oz}
            unit="oz"
          />
          <ProgressBar
            label="Sleep"
            value={stats.todayLog.sleep_hours}
            target={stats.targets.sleep_hours}
            unit="hrs"
          />
          <ProgressBar
            label="Protein"
            value={stats.todayLog.protein_g}
            target={stats.targets.protein_g}
            unit="g"
          />
          <ProgressBar
            label="Calories"
            value={stats.todayLog.calories}
            target={stats.targets.calories}
            unit="cal"
          />
        </div>
      </div>

      {!stats.blocksError && !stats.blocksMigrationPending && (
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
                    <button type="submit" className={day.done ? "btn-primary" : "btn-secondary"}>
                      {day.done ? "Done ✓" : "Mark done"}
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      <Link href="/stats" className="card block text-center text-brand-600">
        View monthly consistency →
      </Link>
    </div>
  );
}
