import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProgressBar } from "@/components/ProgressBar";
import { computeStreak, computeWeeklyCompletion } from "@/lib/streak";
import { addDaysToKey, currentWeekKeys, todayKey } from "@/lib/dates";

const DEFAULT_TARGETS = { water_oz: 64, sleep_hours: 8, protein_g: 150, calories: 2000 };

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = todayKey();
  const historyStart = addDaysToKey(today, -90);

  const [
    { data: goal },
    { data: targets },
    { data: log },
    { data: workoutDaysRaw },
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
    supabase.from("workout_days").select("day_of_week, is_active").eq("user_id", user!.id),
    supabase
      .from("workout_completions")
      .select("completion_date")
      .eq("user_id", user!.id)
      .gte("completion_date", historyStart),
  ]);

  const t = targets ?? DEFAULT_TARGETS;
  const l = log ?? { water_oz: 0, sleep_hours: 0, protein_g: 0, calories: 0 };

  const activeDaysOfWeek = new Set(
    (workoutDaysRaw ?? []).filter((d) => d.is_active).map((d) => d.day_of_week)
  );
  const completedDateKeys = new Set((completionsRaw ?? []).map((c) => c.completion_date));

  const streak = computeStreak(activeDaysOfWeek, completedDateKeys);
  const { scheduled, completed, pct } = computeWeeklyCompletion(
    currentWeekKeys(),
    activeDaysOfWeek,
    completedDateKeys
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Today</h1>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {goal?.goal_text && (
        <Link href="/goals" className="card block">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Your goal
          </div>
          <div className="mt-1 text-gray-800">{goal.goal_text}</div>
          {goal.target_date && (
            <div className="mt-1 text-sm text-gray-500">
              by {new Date(goal.target_date + "T00:00:00").toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </div>
          )}
        </Link>
      )}
      {!goal?.goal_text && (
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

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-gray-700">Today&rsquo;s targets</h2>
          <Link href="/daily" className="text-sm font-medium text-brand-600">
            Log now
          </Link>
        </div>
        <ProgressBar label="Water" value={l.water_oz} target={t.water_oz} unit="oz" />
        <ProgressBar label="Sleep" value={l.sleep_hours} target={t.sleep_hours} unit="hrs" />
        <ProgressBar label="Protein" value={l.protein_g} target={t.protein_g} unit="g" />
        <ProgressBar label="Calories" value={l.calories} target={t.calories} unit="cal" />
      </div>

      <Link href="/workouts" className="card block text-center text-brand-600">
        View weekly workout plan →
      </Link>
    </div>
  );
}
