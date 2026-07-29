import { createClient } from "@/lib/supabase/server";
import { WorkoutScheduler } from "@/components/WorkoutScheduler";
import type { WorkoutBlock } from "@/lib/types";

export default async function WorkoutsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: blocks } = await supabase
    .from("workout_blocks")
    .select("id, day_of_week, title, exercises")
    .eq("user_id", user!.id)
    .order("day_of_week");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Workouts</h1>
        <p className="text-sm text-gray-500">
          Drag a day to reorder your plan. Tap a day to name it and add exercises.
        </p>
      </div>

      <div className="card">
        <WorkoutScheduler initialBlocks={(blocks ?? []) as WorkoutBlock[]} />
      </div>
    </div>
  );
}
