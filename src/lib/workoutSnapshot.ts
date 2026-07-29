/**
 * True exactly when this checkbox toggle is the one that completes the
 * checklist — it just went from unchecked to checked, and that was the
 * last remaining exercise. Never fires on an uncheck. The caller is
 * responsible for not calling this once the day is already marked done
 * (further toggles at that point should just keep the snapshot fresh,
 * not re-trigger "auto complete").
 */
export function shouldAutoComplete(
  wasChecked: boolean,
  nextCheckedCount: number,
  totalExercises: number
): boolean {
  return !wasChecked && totalExercises > 0 && nextCheckedCount === totalExercises;
}

/**
 * Whether exercise `index` should render as checked, given a stored
 * snapshot's `checked_exercises`. `null` means no per-exercise tracking
 * was recorded for that entry (e.g. marked done via the retroactive
 * catch-up control, or the row predates snapshotting) — always false,
 * never treated as "everything checked."
 */
export function isExerciseChecked(checkedIndices: number[] | null, index: number): boolean {
  return checkedIndices !== null && checkedIndices.includes(index);
}
