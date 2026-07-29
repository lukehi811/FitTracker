"use client";

import { useState } from "react";
import { saveWorkoutSnapshot, unmarkWorkoutDone } from "@/lib/actions/workouts";
import { shouldAutoComplete } from "@/lib/workoutSnapshot";
import type { Exercise } from "@/lib/types";

/**
 * Owns the exercise checklist AND the mark-done/undo button together (not
 * split across two components) because the button needs to read whatever's
 * currently checked to build the snapshot — both "finished checking every
 * box" and "tapped Mark day done directly" end up calling the same
 * saveWorkoutSnapshot with the live checked state, not a separately-synced
 * copy. Checked state is seeded from the DB (the day's existing snapshot,
 * if any) and, once the day is done, kept fresh in the DB on every further
 * toggle — no localStorage anywhere.
 */
export function WorkoutChecklistCard({
  date,
  blockTitle,
  exercises,
  initialDone,
  initialCheckedIndices,
}: {
  date: string;
  blockTitle: string;
  exercises: Exercise[];
  initialDone: boolean;
  initialCheckedIndices: number[] | null;
}) {
  const [checked, setChecked] = useState<Set<number>>(new Set(initialCheckedIndices ?? []));
  const [done, setDone] = useState(initialDone);
  const [pending, setPending] = useState(false);

  async function persistSnapshot(nextChecked: Set<number>) {
    setPending(true);
    try {
      await saveWorkoutSnapshot(date, blockTitle, exercises, [...nextChecked]);
      setDone(true);
    } catch (err) {
      console.error(err);
      alert("Couldn't save — please try again.");
    } finally {
      setPending(false);
    }
  }

  async function toggleExercise(index: number) {
    const wasChecked = checked.has(index);
    const next = new Set(checked);
    if (wasChecked) next.delete(index);
    else next.add(index);
    setChecked(next);

    if (done) {
      // day's already marked done — keep the snapshot in sync with corrections
      await persistSnapshot(next);
    } else if (shouldAutoComplete(wasChecked, next.size, exercises.length)) {
      await persistSnapshot(next);
    }
  }

  async function handleUndo() {
    setPending(true);
    try {
      await unmarkWorkoutDone(date);
      setDone(false);
    } catch (err) {
      console.error(err);
      alert("Couldn't undo — please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="text-sm font-medium text-gray-800">{blockTitle}</div>

      {exercises.length > 0 ? (
        <ul className="space-y-1">
          {exercises.map((ex, i) => {
            const isChecked = checked.has(i);
            return (
              <li key={i}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 rounded border-gray-300 text-brand-600 focus:ring-brand-400"
                    checked={isChecked}
                    onChange={() => toggleExercise(i)}
                  />
                  <span
                    className={`flex-1 text-sm ${isChecked ? "text-gray-400 line-through" : "text-gray-800"}`}
                  >
                    {ex.name}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">
                    {ex.sets}×{ex.reps}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-gray-400">
          No exercises added for this day yet — add some from the Workouts tab.
        </p>
      )}

      <button
        type="button"
        onClick={done ? handleUndo : () => persistSnapshot(checked)}
        disabled={pending}
        className={`w-full ${done ? "btn-primary" : "btn-secondary"}`}
      >
        {done ? "Done for today ✓ (tap to undo)" : "Mark day done"}
      </button>
    </>
  );
}
