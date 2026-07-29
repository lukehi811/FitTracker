import { createClient } from "@/lib/supabase/server";
import { saveGoal } from "@/lib/actions/goals";

export default async function GoalsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: goal } = await supabase
    .from("goals")
    .select("goal_text, target_date")
    .eq("user_id", user!.id)
    .maybeSingle();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Your Goal</h1>
      <p className="text-sm text-gray-500">
        What are you working toward? Keep it simple — one sentence is plenty.
      </p>

      <form action={saveGoal} className="card space-y-4">
        <div>
          <label className="field-label" htmlFor="goal_text">
            Goal
          </label>
          <textarea
            className="field-input"
            id="goal_text"
            name="goal_text"
            rows={3}
            placeholder='e.g. "Lose 20 lbs by August" or "Run a 5k without stopping"'
            defaultValue={goal?.goal_text ?? ""}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="target_date">
            Target date <span className="text-gray-400">(optional)</span>
          </label>
          <input
            className="field-input"
            id="target_date"
            name="target_date"
            type="date"
            defaultValue={goal?.target_date ?? ""}
          />
        </div>

        <button type="submit" className="btn-primary w-full">
          Save goal
        </button>
      </form>
    </div>
  );
}
