"use client";

import { useEffect, useState } from "react";
import { ProgressBar } from "@/components/ProgressBar";
import { DAY_SHORT } from "@/lib/dates";
import type { DayCell, DayStatus } from "@/lib/calendarStats";

export function CalendarMonth({
  weeks,
  today,
}: {
  weeks: (DayCell | null)[][];
  today: string;
}) {
  const [selected, setSelected] = useState<DayCell | null>(null);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-400">
        {DAY_SHORT.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {weeks.flatMap((week, wi) =>
          week.map((cell, di) => {
            const clickable = !!cell && cell.status !== "future";
            return (
              <button
                key={cell?.dateKey ?? `pad-${wi}-${di}`}
                type="button"
                disabled={!clickable}
                onClick={() => clickable && setSelected(cell)}
                className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-lg text-sm disabled:cursor-default ${
                  clickable ? "hover:bg-gray-50 active:bg-gray-100" : ""
                } ${cell?.dateKey === today ? "ring-2 ring-brand-300" : ""}`}
              >
                {cell && (
                  <>
                    <span className="text-gray-700">{cell.day}</span>
                    <StatusDot status={cell.status} />
                  </>
                )}
              </button>
            );
          })
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
        <Legend status="full" label="Full" />
        <Legend status="partial" label="Partial" />
        <Legend status="none" label="Missed" />
        <Legend status="future" label="Upcoming" />
      </div>

      {selected && <DayDetailModal day={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Legend({ status, label }: { status: DayStatus; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <StatusDot status={status} />
      {label}
    </span>
  );
}

function StatusDot({ status }: { status: DayStatus }) {
  if (status === "future") {
    return <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-gray-300" />;
  }
  if (status === "none") {
    return <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-gray-300" />;
  }
  if (status === "partial") {
    return (
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full bg-gray-300"
        style={{ backgroundImage: "linear-gradient(90deg, #eab308 50%, transparent 50%)" }}
      />
    );
  }
  return <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />;
}

function DayDetailModal({ day, onClose }: { day: DayCell; onClose: () => void }) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const label = new Date(`${day.dateKey}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const log = day.log ?? { water_oz: 0, sleep_hours: 0, protein_g: 0, calories: 0 };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={label}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">{label}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="mb-2 text-sm font-medium text-gray-600">Diet</h3>
            <div className="space-y-3">
              <ProgressBar label="Water" value={log.water_oz} target={day.targets.water_oz} unit="oz" />
              <ProgressBar
                label="Sleep"
                value={log.sleep_hours}
                target={day.targets.sleep_hours}
                unit="hrs"
              />
              <ProgressBar
                label="Protein"
                value={log.protein_g}
                target={day.targets.protein_g}
                unit="g"
              />
              <ProgressBar label="Calories" value={log.calories} target={day.targets.calories} unit="cal" />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="mb-2 text-sm font-medium text-gray-600">Workout</h3>
            {day.isScheduled && day.block ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">{day.block.title}</span>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                      day.workoutDone ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {day.workoutDone ? "Done ✓" : "Not done"}
                  </span>
                </div>
                {day.block.exercises.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {day.block.exercises.map((ex, i) => (
                      <li key={i} className="flex items-center justify-between text-sm text-gray-700">
                        <span>{ex.name}</span>
                        <span className="text-xs text-gray-400">
                          {ex.sets}×{ex.reps}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-gray-400">No exercises listed.</p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">Rest day — no workout scheduled.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
