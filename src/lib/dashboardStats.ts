import type { createClient } from "@/lib/supabase/server";
import { computeStreak, computeWeeklyCompletion } from "@/lib/streak";
import { isDietDayHit } from "@/lib/diet";
import { isMissingTableError } from "@/lib/errors";
import { addDaysToKey, currentWeekKeys, daysBetweenKeys, todayKey } from "@/lib/dates";
import { DEFAULT_TARGETS, isBlockScheduled, type DailyValues, type WorkoutBlock } from "@/lib/types";

export type DashboardStats = {
  goal: { goal_text: string; target_date: string | null } | null;
  countdownText: string | null;
  targets: DailyValues;
  todayLog: DailyValues;
  blocks: WorkoutBlock[];
  blocksError: boolean;
  blocksMigrationPending: boolean;
  completedDateKeys: Set<string>;
  streak: number;
  weeklyCompletion: { scheduled: number; completed: number; pct: number };
  todayBlock: WorkoutBlock | null;
  todayIsScheduled: boolean;
  todayDone: boolean;
  dietDaysHit: number;
  elapsedWeekDays: number;
};

/**
 * Shared by the owner's Dashboard and the read-only friend-dashboard view —
 * same numbers either way, RLS (owner-only vs. accepted-friend-read) is what
 * actually decides whether the caller is allowed to see them.
 */
export async function getDashboardStats(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<DashboardStats> {
  const today = todayKey();
  const todayDow = new Date().getDay();
  const historyStart = addDaysToKey(today, -90);
  const weekKeys = currentWeekKeys();
  const weekStart = weekKeys[0];
  const elapsedWeekKeys = weekKeys.filter((k) => k <= today);

  const [
    { data: goal },
    { data: targets },
    { data: todayLogRaw },
    { data: weekLogsRaw },
    { data: blocksRaw, error: blocksError },
    { data: completionsRaw },
  ] = await Promise.all([
    supabase.from("goals").select("goal_text, target_date").eq("user_id", userId).maybeSingle(),
    supabase
      .from("daily_targets")
      .select("water_oz, sleep_hours, protein_g, calories")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("daily_logs")
      .select("water_oz, sleep_hours, protein_g, calories")
      .eq("user_id", userId)
      .eq("log_date", today)
      .maybeSingle(),
    supabase
      .from("daily_logs")
      .select("log_date, water_oz, sleep_hours, protein_g, calories")
      .eq("user_id", userId)
      .gte("log_date", weekStart)
      .lte("log_date", today),
    supabase
      .from("workout_blocks")
      .select("id, day_of_week, title, exercises")
      .eq("user_id", userId),
    supabase
      .from("daily_workout_completions")
      .select("completion_date")
      .eq("user_id", userId)
      .gte("completion_date", historyStart),
  ]);

  const t = targets ?? DEFAULT_TARGETS;
  const l = todayLogRaw ?? { water_oz: 0, sleep_hours: 0, protein_g: 0, calories: 0 };
  const blocks: WorkoutBlock[] = blocksRaw ?? [];

  const activeDaysOfWeek = new Set(blocks.filter(isBlockScheduled).map((b) => b.day_of_week));
  const completedDateKeys = new Set((completionsRaw ?? []).map((c) => c.completion_date));

  const streak = computeStreak(activeDaysOfWeek, completedDateKeys);
  const weeklyCompletion = computeWeeklyCompletion(weekKeys, activeDaysOfWeek, completedDateKeys);

  const todayBlock = blocks.find((b) => b.day_of_week === todayDow) ?? null;
  const todayIsScheduled = todayBlock ? isBlockScheduled(todayBlock) : false;
  const todayDone = completedDateKeys.has(today);

  const weekLogsByDate = new Map(
    (weekLogsRaw ?? []).map((row) => [row.log_date, row as DailyValues])
  );
  const dietDaysHit = elapsedWeekKeys.filter((k) => {
    const log = weekLogsByDate.get(k);
    return log ? isDietDayHit(log, t) : false;
  }).length;

  let countdownText: string | null = null;
  if (goal?.target_date) {
    const days = daysBetweenKeys(today, goal.target_date);
    if (days > 1) countdownText = `${days} days until ${goal.goal_text}`;
    else if (days === 1) countdownText = `1 day until ${goal.goal_text}`;
    else if (days === 0) countdownText = `Today's the day — ${goal.goal_text}`;
    else countdownText = `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} past target date`;
  }

  return {
    goal: goal ?? null,
    countdownText,
    targets: t,
    todayLog: l,
    blocks,
    blocksError: !!blocksError && !isMissingTableError(blocksError),
    blocksMigrationPending: isMissingTableError(blocksError),
    completedDateKeys,
    streak,
    weeklyCompletion,
    todayBlock,
    todayIsScheduled,
    todayDone,
    dietDaysHit,
    elapsedWeekDays: elapsedWeekKeys.length,
  };
}
