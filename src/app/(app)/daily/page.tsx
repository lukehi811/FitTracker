import { createClient } from "@/lib/supabase/server";
import { saveLog } from "@/lib/actions/daily";
import { toggleWorkoutCompletion } from "@/lib/actions/workouts";
import { ProgressBar } from "@/components/ProgressBar";
import { ExerciseChecklist } from "@/components/ExerciseChecklist";
import { isMissingTableError } from "@/lib/errors";
import { todayKey } from "@/lib/dates";
import { DEFAULT_TARGETS, isBlockScheduled, type WorkoutBlock } from "@/lib/types";

export default async function DailyPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = todayKey();
  const todayDow = new Date().getDay();

  const [{ data: targets }, { data: log }, { data: blockRaw, error: blockError }, { data: completion }] =
    await Promise.all([
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
        .from("workout_blocks")
        .select("id, day_of_week, title, exercises")
        .eq("user_id", user!.id)
        .eq("day_of_week", todayDow)
        .maybeSingle(),
      supabase
        .from("daily_workout_completions")
        .select("id")
        .eq("user_id", user!.id)
        .eq("completion_date", today)
        .maybeSingle(),
    ]);

  const t = targets ?? DEFAULT_TARGETS;
  const l = log ?? { water_oz: 0, sleep_hours: 0, protein_g: 0, calories: 0 };
  const todayBlock = (blockRaw as WorkoutBlock | null) ?? null;
  const todayIsScheduled = todayBlock ? isBlockScheduled(todayBlock) : false;
  const todayDone = !!completion;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Daily</h1>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <div className="card space-y-4">
        <h2 className="font-medium text-gray-700">Diet</h2>

        <ProgressBar label="Water" value={l.water_oz} target={t.water_oz} unit="oz" />
        <ProgressBar label="Sleep" value={l.sleep_hours} target={t.sleep_hours} unit="hrs" />
        <ProgressBar label="Protein" value={l.protein_g} target={t.protein_g} unit="g" />
        <ProgressBar label="Calories" value={l.calories} target={t.calories} unit="cal" />

        <form action={saveLog} className="space-y-3 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label" htmlFor="water_oz">
                Water (oz)
              </label>
              <input
                className="field-input"
                inputMode="decimal"
                type="number"
                step="0.1"
                min="0"
                id="water_oz"
                name="water_oz"
                defaultValue={l.water_oz}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="sleep_hours">
                Sleep (hrs)
              </label>
              <input
                className="field-input"
                inputMode="decimal"
                type="number"
                step="0.1"
                min="0"
                id="sleep_hours"
                name="sleep_hours"
                defaultValue={l.sleep_hours}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="protein_g">
                Protein (g)
              </label>
              <input
                className="field-input"
                inputMode="decimal"
                type="number"
                step="1"
                min="0"
                id="protein_g"
                name="protein_g"
                defaultValue={l.protein_g}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="calories">
                Calories
              </label>
              <input
                className="field-input"
                inputMode="decimal"
                type="number"
                step="1"
                min="0"
                id="calories"
                name="calories"
                defaultValue={l.calories}
              />
            </div>
          </div>
          <button type="submit" className="btn-primary w-full">
            Save today&rsquo;s log
          </button>
        </form>
      </div>

      <div className="card space-y-3">
        <h2 className="font-medium text-gray-700">Workout</h2>

        {blockError && !isMissingTableError(blockError) ? (
          <p className="text-sm text-red-600">Couldn&rsquo;t load today&rsquo;s workout.</p>
        ) : blockError ? (
          <p className="text-sm text-amber-600">
            Workout scheduler isn&rsquo;t set up yet — run supabase/migrations/002_workout_blocks.sql.
          </p>
        ) : todayIsScheduled && todayBlock ? (
          <>
            <div className="text-sm font-medium text-gray-800">{todayBlock.title}</div>

            {todayBlock.exercises.length > 0 ? (
              <ExerciseChecklist
                storageKey={`exercise-check:${user!.id}:${today}:${todayBlock.id}`}
                exercises={todayBlock.exercises}
              />
            ) : (
              <p className="text-sm text-gray-400">
                No exercises added for this day yet — add some from the Workouts tab.
              </p>
            )}

            <form action={toggleWorkoutCompletion} className="pt-2">
              <input type="hidden" name="date" value={today} />
              <button
                type="submit"
                className={`w-full ${todayDone ? "btn-primary" : "btn-secondary"}`}
              >
                {todayDone ? "Done for today ✓ (tap to undo)" : "Mark day done"}
              </button>
            </form>
          </>
        ) : (
          <p className="text-sm text-gray-500">Rest day — nothing scheduled.</p>
        )}
      </div>
    </div>
  );
}
