import type { createClient } from "@/lib/supabase/server";
import { isDietDayHit } from "@/lib/diet";
import { isMissingTableError } from "@/lib/errors";
import { todayKey } from "@/lib/dates";
import { DEFAULT_TARGETS, isBlockScheduled, type DailyValues, type WorkoutBlock } from "@/lib/types";

export type MonthStat = {
  monthKey: string; // "YYYY-MM"
  label: string; // "July 2026"
  workout: { scheduled: number; completed: number; pct: number };
  diet: { hit: number; total: number; pct: number };
};

export type MonthlyStatsResult = {
  months: MonthStat[];
  blocksMigrationPending: boolean;
  error: boolean;
};

function monthKeyOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

function monthLabelOf(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function nextMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const next = new Date(y, m, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

/** All date keys in a given month, capped at `today` so the current month doesn't count unarrived days as missed. */
function daysInMonthCapped(monthKey: string, today: string): string[] {
  const [y, m] = monthKey.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const keys: string[] = [];
  for (let d = 1; d <= lastDay; d++) {
    const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (key > today) break;
    keys.push(key);
  }
  return keys;
}

export async function getMonthlyStats(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<MonthlyStatsResult> {
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
      .eq("user_id", userId),
    supabase
      .from("workout_blocks")
      .select("id, day_of_week, title, exercises")
      .eq("user_id", userId),
    supabase.from("daily_workout_completions").select("completion_date").eq("user_id", userId),
  ]);

  if (blocksError && !isMissingTableError(blocksError)) {
    return { months: [], blocksMigrationPending: false, error: true };
  }

  const allDateKeys = [
    ...(logsRaw ?? []).map((r) => r.log_date as string),
    ...(completionsRaw ?? []).map((c) => c.completion_date as string),
  ];

  if (allDateKeys.length === 0) {
    return { months: [], blocksMigrationPending: isMissingTableError(blocksError), error: false };
  }

  const t = targets ?? DEFAULT_TARGETS;
  const blocks: WorkoutBlock[] = blocksRaw ?? [];
  const activeDaysOfWeek = new Set(blocks.filter(isBlockScheduled).map((b) => b.day_of_week));
  const completedDateKeys = new Set((completionsRaw ?? []).map((c) => c.completion_date));
  const logsByDate = new Map((logsRaw ?? []).map((row) => [row.log_date, row as DailyValues]));

  const earliestMonth = monthKeyOf([...allDateKeys].sort()[0]);
  const currentMonth = monthKeyOf(today);

  const monthKeys: string[] = [];
  for (let cursor = earliestMonth; cursor <= currentMonth; cursor = nextMonthKey(cursor)) {
    monthKeys.push(cursor);
  }

  const months: MonthStat[] = monthKeys
    .map((mk) => {
      const dayKeys = daysInMonthCapped(mk, today);

      let scheduled = 0;
      let completed = 0;
      let dietHit = 0;

      for (const dk of dayKeys) {
        const dow = new Date(`${dk}T00:00:00`).getDay();
        if (activeDaysOfWeek.has(dow)) {
          scheduled++;
          if (completedDateKeys.has(dk)) completed++;
        }
        const log = logsByDate.get(dk);
        if (log && isDietDayHit(log, t)) dietHit++;
      }

      return {
        monthKey: mk,
        label: monthLabelOf(mk),
        workout: {
          scheduled,
          completed,
          pct: scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0,
        },
        diet: {
          hit: dietHit,
          total: dayKeys.length,
          pct: dayKeys.length > 0 ? Math.round((dietHit / dayKeys.length) * 100) : 0,
        },
      };
    })
    .reverse();

  return { months, blocksMigrationPending: isMissingTableError(blocksError), error: false };
}
