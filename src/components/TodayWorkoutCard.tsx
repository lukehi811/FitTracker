import { markWorkoutDone, toggleWorkoutCompletion } from "@/lib/actions/workouts";
import { ExerciseChecklist } from "@/components/ExerciseChecklist";
import type { WorkoutBlock } from "@/lib/types";

/**
 * Same card, same checklist, same completion state on both Dashboard and
 * Daily — checking off the last exercise or tapping "Mark day done" on
 * either page updates the one daily_workout_completions row for today.
 */
export function TodayWorkoutCard({
  today,
  userId,
  todayBlock,
  todayIsScheduled,
  todayDone,
  blocksError,
  blocksMigrationPending,
}: {
  today: string;
  userId: string;
  todayBlock: WorkoutBlock | null;
  todayIsScheduled: boolean;
  todayDone: boolean;
  blocksError: boolean;
  blocksMigrationPending: boolean;
}) {
  return (
    <div className="card space-y-3">
      <h2 className="font-medium text-gray-700">Today&rsquo;s workout</h2>

      {blocksError ? (
        <p className="text-sm text-red-600">Couldn&rsquo;t load today&rsquo;s workout.</p>
      ) : blocksMigrationPending ? (
        <p className="text-sm text-amber-600">
          Workout scheduler isn&rsquo;t set up yet — run supabase/migrations/002_workout_blocks.sql.
        </p>
      ) : todayIsScheduled && todayBlock ? (
        <>
          <div className="text-sm font-medium text-gray-800">{todayBlock.title}</div>

          {todayBlock.exercises.length > 0 ? (
            <ExerciseChecklist
              storageKey={`exercise-check:${userId}:${today}:${todayBlock.id}`}
              exercises={todayBlock.exercises}
              onAllChecked={markWorkoutDone.bind(null, today)}
            />
          ) : (
            <p className="text-sm text-gray-400">
              No exercises added for this day yet — add some from the Workouts tab.
            </p>
          )}

          <form action={toggleWorkoutCompletion} className="pt-2">
            <input type="hidden" name="date" value={today} />
            <button type="submit" className={`w-full ${todayDone ? "btn-primary" : "btn-secondary"}`}>
              {todayDone ? "Done for today ✓ (tap to undo)" : "Mark day done"}
            </button>
          </form>
        </>
      ) : (
        <p className="text-sm text-gray-500">Rest day — nothing scheduled.</p>
      )}
    </div>
  );
}
