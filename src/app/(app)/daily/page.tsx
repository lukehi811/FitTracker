import { createClient } from "@/lib/supabase/server";
import { saveTargets, saveLog } from "@/lib/actions/daily";
import { ProgressBar } from "@/components/ProgressBar";
import { todayKey } from "@/lib/dates";

const DEFAULT_TARGETS = { water_oz: 64, sleep_hours: 8, protein_g: 150, calories: 2000 };

export default async function DailyPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: targets }, { data: log }] = await Promise.all([
    supabase
      .from("daily_targets")
      .select("water_oz, sleep_hours, protein_g, calories")
      .eq("user_id", user!.id)
      .maybeSingle(),
    supabase
      .from("daily_logs")
      .select("water_oz, sleep_hours, protein_g, calories")
      .eq("user_id", user!.id)
      .eq("log_date", todayKey())
      .maybeSingle(),
  ]);

  const t = targets ?? DEFAULT_TARGETS;
  const l = log ?? { water_oz: 0, sleep_hours: 0, protein_g: 0, calories: 0 };

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

      <div className="card space-y-4">
        <h2 className="font-medium text-gray-700">Progress toward targets</h2>
        <ProgressBar label="Water" value={l.water_oz} target={t.water_oz} unit="oz" />
        <ProgressBar label="Sleep" value={l.sleep_hours} target={t.sleep_hours} unit="hrs" />
        <ProgressBar label="Protein" value={l.protein_g} target={t.protein_g} unit="g" />
        <ProgressBar label="Calories" value={l.calories} target={t.calories} unit="cal" />
      </div>

      <form action={saveLog} className="card space-y-4">
        <h2 className="font-medium text-gray-700">Log today&rsquo;s actuals</h2>

        <div className="grid grid-cols-2 gap-4">
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

      <details className="card">
        <summary className="cursor-pointer font-medium text-gray-700">
          Edit your daily targets
        </summary>
        <form action={saveTargets} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="t_water_oz">
                Water (oz)
              </label>
              <input
                className="field-input"
                inputMode="decimal"
                type="number"
                step="0.1"
                min="0"
                id="t_water_oz"
                name="water_oz"
                defaultValue={t.water_oz}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="t_sleep_hours">
                Sleep (hrs)
              </label>
              <input
                className="field-input"
                inputMode="decimal"
                type="number"
                step="0.1"
                min="0"
                id="t_sleep_hours"
                name="sleep_hours"
                defaultValue={t.sleep_hours}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="t_protein_g">
                Protein (g)
              </label>
              <input
                className="field-input"
                inputMode="decimal"
                type="number"
                step="1"
                min="0"
                id="t_protein_g"
                name="protein_g"
                defaultValue={t.protein_g}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="t_calories">
                Calories
              </label>
              <input
                className="field-input"
                inputMode="decimal"
                type="number"
                step="1"
                min="0"
                id="t_calories"
                name="calories"
                defaultValue={t.calories}
              />
            </div>
          </div>
          <button type="submit" className="btn-secondary w-full">
            Save targets
          </button>
        </form>
      </details>
    </div>
  );
}
