import type { createClient } from "@/lib/supabase/server";
import { isDietDayHit } from "@/lib/diet";
import { isMissingTableError } from "@/lib/errors";
import { todayKey } from "@/lib/dates";
import { DEFAULT_TARGETS, isBlockScheduled, type DailyValues, type WorkoutBlock } from "@/lib/types";

export type DayStatus = "future" | "none" | "partial" | "full";

export type DayCell = {
  dateKey: string;
  day: number;
  status: DayStatus;
  log: DailyValues | null;
  targets: DailyValues;
  block: WorkoutBlock | null;
  isScheduled: boolean;
  workoutDone: boolean;
};

export type MonthCalendar = {
  monthKey: string;
  label: string;
  weeks: (DayCell | null)[][];
  summary: {
    fullCount: number;
    partialCount: number;
    noneCount: number;
    evaluatedDays: number;
    workoutScheduled: number;
    workoutCompleted: number;
    workoutPct: number;
    dietHit: number;
    dietPct: number;
  };
  blocksMigrationPending: boolean;
  error: boolean;
};

/**
 * A day's status is "how many of that day's applicable goals were met":
 * diet is always applicable (1 goal); a scheduled workout day adds a second
 * (2 goals total), a rest day doesn't (1 goal total, diet only). 0 met =
 * none, all met = full, some-but-not-all = partial. This is symmetric for
 * both workout days and rest days rather than treating "nothing scheduled"
 * as an automatic pass.
 */
export function computeDayStatus(
  dietOk: boolean,
  isScheduled: boolean,
  workoutDone: boolean
): DayStatus {
  let applicable = 1;
  let met = dietOk ? 1 : 0;

  if (isScheduled) {
    applicable += 1;
    if (workoutDone) met += 1;
  }

  if (met === 0) return "none";
  if (met === applicable) return "full";
  return "partial";
}

export function isValidMonthKey(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}$/.test(s);
}

export function addMonthsToKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelOf(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function emptyCalendar(monthKey: string, opts: { error?: boolean; blocksMigrationPending?: boolean } = {}): MonthCalendar {
  return {
    monthKey,
    label: monthLabelOf(monthKey),
    weeks: [],
    summary: {
      fullCount: 0,
      partialCount: 0,
      noneCount: 0,
      evaluatedDays: 0,
      workoutScheduled: 0,
      workoutCompleted: 0,
      workoutPct: 0,
      dietHit: 0,
      dietPct: 0,
    },
    blocksMigrationPending: !!opts.blocksMigrationPending,
    error: !!opts.error,
  };
}

export async function getMonthCalendar(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  monthKey: string
): Promise<MonthCalendar> {
  const [y, m] = monthKey.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const monthStart = `${monthKey}-01`;
  const monthEnd = `${monthKey}-${String(lastDay).padStart(2, "0")}`;
  const today = todayKey();

  const [
    { data: targets },
    { data: logsRaw },
    { data: blocksRaw, error: blocksError },
    { data: completionsRaw },
  ] = await Promise.all([
    supabase
      .from("daily_targets")
      .select("water_oz, sleep_hours, protein_g, calories")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("daily_logs")
      .select("log_date, water_oz, sleep_hours, protein_g, calories")
      .eq("user_id", userId)
      .gte("log_date", monthStart)
      .lte("log_date", monthEnd),
    supabase
      .from("workout_blocks")
      .select("id, day_of_week, title, exercises")
      .eq("user_id", userId),
    supabase
      .from("daily_workout_completions")
      .select("completion_date")
      .eq("user_id", userId)
      .gte("completion_date", monthStart)
      .lte("completion_date", monthEnd),
  ]);

  if (blocksError && !isMissingTableError(blocksError)) {
    return emptyCalendar(monthKey, { error: true });
  }
  if (isMissingTableError(blocksError)) {
    return emptyCalendar(monthKey, { blocksMigrationPending: true });
  }

  const t = targets ?? DEFAULT_TARGETS;
  const blocks: WorkoutBlock[] = blocksRaw ?? [];
  const blocksByDow = new Map(blocks.map((b) => [b.day_of_week, b]));
  const logsByDate = new Map((logsRaw ?? []).map((r) => [r.log_date as string, r as DailyValues]));
  const completedDateKeys = new Set((completionsRaw ?? []).map((c) => c.completion_date as string));

  let fullCount = 0;
  let partialCount = 0;
  let noneCount = 0;
  let evaluatedDays = 0;
  let workoutScheduled = 0;
  let workoutCompleted = 0;
  let dietHit = 0;

  const cells: DayCell[] = [];

  for (let day = 1; day <= lastDay; day++) {
    const dateKey = `${monthKey}-${String(day).padStart(2, "0")}`;
    const dow = new Date(y, m - 1, day).getDay();
    const block = blocksByDow.get(dow) ?? null;
    const isScheduled = block ? isBlockScheduled(block) : false;
    const workoutDone = completedDateKeys.has(dateKey);
    const log = logsByDate.get(dateKey) ?? null;

    let status: DayStatus;

    if (dateKey > today) {
      status = "future";
    } else {
      const dietOk = log ? isDietDayHit(log, t) : false;
      status = computeDayStatus(dietOk, isScheduled, workoutDone);

      evaluatedDays++;
      if (status === "full") fullCount++;
      else if (status === "partial") partialCount++;
      else noneCount++;

      if (isScheduled) {
        workoutScheduled++;
        if (workoutDone) workoutCompleted++;
      }
      if (dietOk) dietHit++;
    }

    cells.push({ dateKey, day, status, log, targets: t, block, isScheduled, workoutDone });
  }

  const firstDow = new Date(y, m - 1, 1).getDay();
  const grid: (DayCell | null)[] = [...Array(firstDow).fill(null), ...cells];
  while (grid.length % 7 !== 0) grid.push(null);

  const weeks: (DayCell | null)[][] = [];
  for (let i = 0; i < grid.length; i += 7) weeks.push(grid.slice(i, i + 7));

  return {
    monthKey,
    label: monthLabelOf(monthKey),
    weeks,
    summary: {
      fullCount,
      partialCount,
      noneCount,
      evaluatedDays,
      workoutScheduled,
      workoutCompleted,
      workoutPct: workoutScheduled > 0 ? Math.round((workoutCompleted / workoutScheduled) * 100) : 0,
      dietHit,
      dietPct: evaluatedDays > 0 ? Math.round((dietHit / evaluatedDays) * 100) : 0,
    },
    blocksMigrationPending: false,
    error: false,
  };
}
