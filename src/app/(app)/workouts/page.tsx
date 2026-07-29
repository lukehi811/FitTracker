import { createClient } from "@/lib/supabase/server";
import { WorkoutScheduler } from "@/components/WorkoutScheduler";
import { isMissingTableError } from "@/lib/errors";
import type { WorkoutBlock } from "@/lib/types";

export default async function WorkoutsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: blocks, error } = await supabase
    .from("workout_blocks")
    .select("id, day_of_week, title, exercises")
    .eq("user_id", user!.id)
    .order("day_of_week");

  const tableMissing = isMissingTableError(error);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Workouts</h1>
        <p className="text-sm text-gray-500">
          Drag a day to reorder your plan. Tap a day to name it and add exercises.
        </p>
      </div>

      {error ? (
        <div className="card space-y-2 border border-red-100 bg-red-50">
          <p className="text-sm font-medium text-red-700">Couldn&rsquo;t load your workout plan.</p>
          <p className="text-sm text-red-600">
            {tableMissing
              ? "The workout_blocks table doesn't exist in this Supabase project yet. Run supabase/migrations/002_workout_blocks.sql in the Supabase SQL editor, then reload this page."
              : error.message}
          </p>
        </div>
      ) : !blocks || blocks.length === 0 ? (
        <div className="card space-y-2">
          <p className="text-sm font-medium text-gray-700">No workout days found yet.</p>
          <p className="text-sm text-gray-500">
            This usually means your account existed before the workout scheduler migration
            ran, so the default 7 days were never created for you. Re-running the backfill in
            supabase/migrations/002_workout_blocks.sql is safe (it skips anyone who already has
            rows) and will create them.
          </p>
        </div>
      ) : (
        <div className="card">
          <WorkoutScheduler initialBlocks={blocks as WorkoutBlock[]} />
        </div>
      )}
    </div>
  );
}
