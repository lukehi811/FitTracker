"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { reorderBlocks, saveBlock } from "@/lib/actions/workouts";
import { DAY_SHORT, MON_TO_SUN_DOW } from "@/lib/dates";
import type { Exercise, WorkoutBlock } from "@/lib/types";

function isRestDay(title: string): boolean {
  return title.trim().toLowerCase() === "rest day";
}

function buildOrderedIds(blocks: WorkoutBlock[]): string[] {
  const byDow = new Map(blocks.map((b) => [b.day_of_week, b.id]));
  return MON_TO_SUN_DOW.map((dow) => byDow.get(dow)).filter(
    (id): id is string => Boolean(id)
  );
}

export function WorkoutScheduler({ initialBlocks }: { initialBlocks: WorkoutBlock[] }) {
  const [blocksById, setBlocksById] = useState<Record<string, WorkoutBlock>>(() =>
    Object.fromEntries(initialBlocks.map((b) => [b.id, b]))
  );
  const [orderedIds, setOrderedIds] = useState<string[]>(() => buildOrderedIds(initialBlocks));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedIds.indexOf(String(active.id));
    const newIndex = orderedIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const previousOrder = orderedIds;
    const newOrder = arrayMove(orderedIds, oldIndex, newIndex);
    setOrderedIds(newOrder);
    setSaving(true);

    try {
      await reorderBlocks(newOrder);
      setBlocksById((prev) => {
        const next = { ...prev };
        newOrder.forEach((id, i) => {
          if (next[id]) next[id] = { ...next[id], day_of_week: MON_TO_SUN_DOW[i] };
        });
        return next;
      });
    } catch (err) {
      console.error(err);
      setOrderedIds(previousOrder);
      alert("Couldn't save the new order — please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleSaved(block: WorkoutBlock) {
    setBlocksById((prev) => ({ ...prev, [block.id]: block }));
    setEditingId(null);
  }

  const editingBlock = editingId ? blocksById[editingId] : null;

  return (
    <div className="space-y-3">
      {saving && <p className="text-xs text-gray-400">Saving order…</p>}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {orderedIds.map((id, index) => {
              const block = blocksById[id];
              if (!block) return null;
              return (
                <BlockRow
                  key={id}
                  id={id}
                  dayLabel={DAY_SHORT[MON_TO_SUN_DOW[index]]}
                  block={block}
                  onEdit={() => setEditingId(id)}
                />
              );
            })}
          </ul>
        </SortableContext>
      </DndContext>

      {editingBlock && (
        <BlockEditorModal
          block={editingBlock}
          onClose={() => setEditingId(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

function BlockRow({
  id,
  dayLabel,
  block,
  onEdit,
}: {
  id: string;
  dayLabel: string;
  block: WorkoutBlock;
  onEdit: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const restDay = isRestDay(block.title);

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5 ${
        isDragging ? "opacity-60 ring-2 ring-brand-300" : ""
      }`}
    >
      <span className="w-9 shrink-0 text-sm font-semibold text-gray-400">{dayLabel}</span>

      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <div
          className={`truncate text-sm font-medium ${
            restDay ? "text-gray-400" : "text-gray-800"
          }`}
        >
          {block.title}
        </div>
        <div className="truncate text-xs text-gray-400">
          {block.exercises.length > 0
            ? `${block.exercises.length} exercise${block.exercises.length === 1 ? "" : "s"}`
            : restDay
              ? "No exercises"
              : "No exercises yet"}
        </div>
      </button>

      <button
        type="button"
        aria-label="Drag to reorder"
        className="shrink-0 touch-none rounded-lg px-2 py-2 text-lg leading-none text-gray-300 active:text-gray-500"
        {...attributes}
        {...listeners}
      >
        ☰
      </button>
    </li>
  );
}

function BlockEditorModal({
  block,
  onClose,
  onSaved,
}: {
  block: WorkoutBlock;
  onClose: () => void;
  onSaved: (block: WorkoutBlock) => void;
}) {
  const [title, setTitle] = useState(block.title);
  const [exercises, setExercises] = useState<Exercise[]>(block.exercises);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  function updateExercise(index: number, patch: Partial<Exercise>) {
    setExercises((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  }

  function addExercise() {
    setExercises((prev) => [...prev, { name: "", sets: 3, reps: 10 }]);
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      const updated = await saveBlock(block.id, title, exercises);
      onSaved(updated);
    } catch (err) {
      console.error(err);
      alert("Couldn't save — please try again.");
    } finally {
      setIsSaving(false);
    }
  }

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
        aria-label="Edit workout day"
      >
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Edit workout day</h2>

        <label className="field-label" htmlFor="block_title">
          Title
        </label>
        <input
          id="block_title"
          className="field-input mb-4"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Push Day"
        />

        <div className="mb-2 flex items-center justify-between">
          <span className="field-label mb-0">Exercises</span>
          <button type="button" onClick={addExercise} className="text-sm font-medium text-brand-600">
            + Add exercise
          </button>
        </div>

        <div className="space-y-2">
          {exercises.length === 0 && (
            <p className="text-sm text-gray-400">No exercises yet — add one below.</p>
          )}
          {exercises.map((ex, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                className="field-input flex-1"
                type="text"
                placeholder="Exercise"
                value={ex.name}
                onChange={(e) => updateExercise(i, { name: e.target.value })}
              />
              <input
                className="field-input w-16 text-center"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="Sets"
                value={ex.sets}
                onChange={(e) => updateExercise(i, { sets: Number(e.target.value) })}
              />
              <span className="text-gray-300">×</span>
              <input
                className="field-input w-16 text-center"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="Reps"
                value={ex.reps}
                onChange={(e) => updateExercise(i, { reps: Number(e.target.value) })}
              />
              <button
                type="button"
                onClick={() => removeExercise(i)}
                aria-label="Remove exercise"
                className="shrink-0 px-1 text-gray-300 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary flex-1"
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
