"use client";

import { useEffect, useState } from "react";
import type { Exercise } from "@/lib/types";

/**
 * "Check off as you go" aid while doing today's workout. Persisted to
 * localStorage only (keyed by user+date+block) — it's a personal in-session
 * checklist, not tracked server-side. Marking the day done is a separate,
 * independent action (see the "Mark day done" button on the Daily page).
 */
export function ExerciseChecklist({
  storageKey,
  exercises,
}: {
  storageKey: string;
  exercises: Exercise[];
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
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      try {
        localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        // localStorage unavailable — checklist just won't persist, non-fatal
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
