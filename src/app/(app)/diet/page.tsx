import { createClient } from "@/lib/supabase/server";
import { saveTargets } from "@/lib/actions/daily";

const DEFAULT_TARGETS = { water_oz: 64, sleep_hours: 8, protein_g: 150, calories: 2000 };

export default async function DietPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: targets } = await supabase
    .from("daily_targets")
    .select("water_oz, sleep_hours, protein_g, calories")
    .eq("user_id", user!.id)
    .maybeSingle();

  const t = targets ?? DEFAULT_TARGETS;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Diet targets</h1>
        <p className="text-sm text-gray-500">
          Set your personal daily goals here. Log today&rsquo;s actuals from the Dashboard.
        </p>
      </div>

      <form action={saveTargets} className="card space-y-4">
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
              defaultValue={t.water_oz}
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
              defaultValue={t.sleep_hours}
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
              defaultValue={t.protein_g}
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
              defaultValue={t.calories}
            />
          </div>
        </div>
        <button type="submit" className="btn-primary w-full">
          Save targets
        </button>
      </form>
    </div>
  );
}
