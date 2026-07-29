"use client";

import { useEffect, useState } from "react";
import type { Exercise } from "@/lib/types";

/**
 * "Check off as you go" aid while doing today's workout. The checked state
 * itself is persisted to localStorage only (keyed by user+date+block) — not
 * tracked server-side. Checking off the last exercise fires `onAllChecked`
 * once, which the caller wires to a one-way "mark done" server action;
 * unchecking never fires anything, so it can't un-mark an already-done day.
 * Same component/storageKey is used on both Dashboard and Daily so the
 * checked state (and the completion it can trigger) matches on either page.
 */
export function ExerciseChecklist({
  storageKey,
  exercises,
  onAllChecked,
}: {
  storageKey: string;
  exercises: Exercise[];
  onAllChecked?: () => void;
}) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setChecked(new Set(JSON.parse(raw)));
      else setChecked(new Set());
    } catch {
      setChecked(new Set());
    }
  }, [storageKey]);

  function toggle(index: number) {
    setChecked((prev) => {
      const wasChecked = prev.has(index);
      const next = new Set(prev);
      if (wasChecked) next.delete(index);
      else next.add(index);

      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        // localStorage unavailable — checklist just won't persist, non-fatal
      }

      if (!wasChecked && next.size === exercises.length) {
        onAllChecked?.();
      }

      return next;
    });
  }

  return (
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
                onChange={() => toggle(i)}
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
  );
}
