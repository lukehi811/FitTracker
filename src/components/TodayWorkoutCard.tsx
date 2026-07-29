import { WorkoutChecklistCard } from "@/components/WorkoutChecklistCard";
import type { WorkoutBlock } from "@/lib/types";

/**
 * Same card, same checklist, same completion state on both Dashboard and
 * Daily — checking off the last exercise or tapping "Mark day done" on
 * either page updates the one daily_workout_completions row for today.
 */
export function TodayWorkoutCard({
  today,
  todayBlock,
  todayIsScheduled,
  todayDone,
  todayCheckedIndices,
  blocksError,
  blocksMigrationPending,
}: {
  today: string;
  todayBlock: WorkoutBlock | null;
  todayIsScheduled: boolean;
  todayDone: boolean;
  todayCheckedIndices: number[] | null;
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
        <WorkoutChecklistCard
          date={today}
          blockTitle={todayBlock.title}
          exercises={todayBlock.exercises}
          initialDone={todayDone}
          initialCheckedIndices={todayCheckedIndices}
        />
      ) : (
        <p className="text-sm text-gray-500">Rest day — nothing scheduled.</p>
      )}
    </div>
  );
}
