import { createClient } from "@/lib/supabase/server";
import { saveWorkoutPlan, toggleCompletion } from "@/lib/actions/workouts";
import { computeStreak, computeWeeklyCompletion } from "@/lib/streak";
import { DAY_NAMES, addDaysToKey, currentWeekKeys, dateKeyToDayOfWeek, todayKey } from "@/lib/dates";

// Monday(1) .. Sunday(0), for a Mon-first week display.
const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

type WorkoutDay = { id: string; day_of_week: number; name: string | null; is_active: boolean };

export default async function WorkoutsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = todayKey();
  const historyStart = addDaysToKey(today, -90);

  const [{ data: workoutDaysRaw }, { data: completionsRaw }] = await Promise.all([
    supabase
      .from("workout_days")
      .select("id, day_of_week, name, is_active")
      .eq("user_id", user!.id),
    supabase
      .from("workout_completions")
      .select("workout_day_id, completion_date")
      .eq("user_id", user!.id)
      .gte("completion_date", historyStart),
  ]);

  const workoutDays: WorkoutDay[] = workoutDaysRaw ?? [];
  const byDow = new Map(workoutDays.map((d) => [d.day_of_week, d]));

  const activeDaysOfWeek = new Set(workoutDays.filter((d) => d.is_active).map((d) => d.day_of_week));
  const completedDateKeys = new Set((completionsRaw ?? []).map((c) => c.completion_date));

  const streak = computeStreak(activeDaysOfWeek, completedDateKeys);
  const weekKeys = currentWeekKeys();
  const { scheduled, completed, pct } = computeWeeklyCompletion(
    weekKeys,
    activeDaysOfWeek,
    completedDateKeys
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Workouts</h1>
        <p className="text-sm text-gray-500">Plan your week, then check off each day.</p>
      </div>

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
        <h2 className="font-medium text-gray-700">This week</h2>
        {weekKeys.map((key) => {
          const dow = dateKeyToDayOfWeek(key);
          const day = byDow.get(dow);
          const isActive = day?.is_active ?? false;
          const isDone = completedDateKeys.has(key);
          const isToday = key === today;

          return (
            <div
              key={key}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 ${
                isToday ? "bg-brand-50" : "bg-gray-50"
              }`}
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800">
                  {DAY_NAMES[dow]}
                  {isToday && <span className="ml-1.5 text-xs text-brand-600">today</span>}
                </div>
                <div className="truncate text-sm text-gray-500">
                  {isActive ? day?.name || "Workout" : "Rest day"}
                </div>
              </div>

              {isActive && day && (
                <form action={toggleCompletion}>
                  <input type="hidden" name="workout_day_id" value={day.id} />
                  <input type="hidden" name="date" value={key} />
                  <button
                    type="submit"
                    className={isDone ? "btn-primary" : "btn-secondary"}
                  >
                    {isDone ? "Done ✓" : "Mark done"}
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      <details className="card">
        <summary className="cursor-pointer font-medium text-gray-700">
          Edit your weekly plan
        </summary>
        <p className="mt-2 text-sm text-gray-500">
          Pick 4-6 days and name them whatever works for you (Push, Pull, Legs, Upper,
          Lower, or anything custom).
        </p>
        <form action={saveWorkoutPlan} className="mt-4 space-y-3">
          {DISPLAY_ORDER.map((dow) => {
            const day = byDow.get(dow);
            return (
              <div key={dow} className="flex items-center gap-3">
                <label className="flex w-24 shrink-0 items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    name={`active_${dow}`}
                    defaultChecked={day?.is_active ?? false}
                    className="h-5 w-5 rounded border-gray-300 text-brand-600 focus:ring-brand-400"
                  />
                  {DAY_NAMES[dow].slice(0, 3)}
                </label>
                <input
                  className="field-input"
                  type="text"
                  name={`name_${dow}`}
                  placeholder="e.g. Push"
                  defaultValue={day?.name ?? ""}
                />
              </div>
            );
          })}
          <button type="submit" className="btn-primary w-full">
            Save plan
          </button>
        </form>
      </details>
    </div>
  );
}
