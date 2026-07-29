"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MON_TO_SUN_DOW } from "@/lib/dates";
import type { Exercise, WorkoutBlock } from "@/lib/types";

/**
 * Persists a new Monday..Sunday ordering of blocks in one atomic call, so a
 * drag-and-drop swap of two days never trips the (deferred) unique
 * constraint on (user_id, day_of_week) partway through.
 */
export async function reorderBlocks(orderedBlockIds: string[]) {
  if (orderedBlockIds.length !== 7) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.rpc("reorder_workout_blocks", {
    p_ids: orderedBlockIds,
    p_days: MON_TO_SUN_DOW,
  });
  if (error) throw error;

  revalidatePath("/workouts");
  revalidatePath("/dashboard");
}

export async function saveBlock(
  blockId: string,
  title: string,
  exercises: Exercise[]
): Promise<WorkoutBlock> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const cleanTitle = title.trim() || "Rest Day";
  const cleanExercises = exercises
    .map((e) => ({
      name: e.name.trim(),
      sets: Math.max(0, Math.round(Number(e.sets) || 0)),
      reps: Math.max(0, Math.round(Number(e.reps) || 0)),
    }))
    .filter((e) => e.name.length > 0);

  const { data, error } = await supabase
    .from("workout_blocks")
    .update({
      title: cleanTitle,
      exercises: cleanExercises,
      updated_at: new Date().toISOString(),
    })
    .eq("id", blockId)
    .eq("user_id", user.id)
    .select("id, day_of_week, title, exercises")
    .single();

  if (error || !data) throw error ?? new Error("Failed to save block");

  revalidatePath("/workouts");
  revalidatePath("/dashboard");

  return data as WorkoutBlock;
}

/**
 * Marks a day done and (re)writes its snapshot in one upsert — used both
 * for the initial "mark done" (auto-triggered by finishing the checklist,
 * or the explicit button, with whatever's currently checked) and to keep
 * the snapshot fresh if the checklist gets edited after the day is already
 * done. `checkedIndices` is `null` when there's no per-exercise tracking to
 * record (the retroactive catch-up control has no checklist to read from).
 *
 * Snapshotting matters because `exercises`/`block_title` are frozen at this
 * moment — workout_blocks can be renamed or dragged to a different day
 * later, and this record should keep showing what was actually done, not
 * whatever currently happens to be scheduled on that weekday.
 */
export async function saveWorkoutSnapshot(
  date: string,
  blockTitle: string,
  exercises: Exercise[],
  checkedIndices: number[] | null
) {
  if (!date) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const cleanExercises = exercises.map((e) => ({
    name: e.name,
    sets: e.sets,
    reps: e.reps,
  }));

  const { data: existing } = await supabase
    .from("daily_workout_completions")
    .select("id")
    .eq("user_id", user.id)
    .eq("completion_date", date)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("daily_workout_completions")
      .update({
        block_title: blockTitle,
        exercises: cleanExercises,
        checked_exercises: checkedIndices,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("daily_workout_completions").insert({
      user_id: user.id,
      completion_date: date,
      block_title: blockTitle,
      exercises: cleanExercises,
      checked_exercises: checkedIndices,
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/daily");
  revalidatePath("/stats");
}

/** Un-marks a day done — deletes the completion row (and its snapshot) outright. */
export async function unmarkWorkoutDone(date: string) {
  if (!date) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("daily_workout_completions")
    .delete()
    .eq("user_id", user.id)
    .eq("completion_date", date);

  revalidatePath("/dashboard");
  revalidatePath("/daily");
  revalidatePath("/stats");
}
