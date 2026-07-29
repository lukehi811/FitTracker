import { addDaysToKey, dateKeyToDayOfWeek, todayKey } from "@/lib/dates";

/**
 * Current streak = consecutive scheduled workout days completed, walking
 * backward from today. If today is a scheduled day but hasn't been logged
 * yet, it's skipped (not counted, not broken) so the streak survives until
 * the day is over.
 */
export function computeStreak(
  activeDaysOfWeek: Set<number>,
  completedDateKeys: Set<string>,
  today: string = todayKey()
): number {
  if (activeDaysOfWeek.size === 0) return 0;

  let streak = 0;
  let cursor = today;
  let allowTodaySkip = true;

  for (let i = 0; i < 400; i++) {
    const dow = dateKeyToDayOfWeek(cursor);

    if (activeDaysOfWeek.has(dow)) {
      if (completedDateKeys.has(cursor)) {
        streak++;
      } else if (cursor === today && allowTodaySkip) {
        allowTodaySkip = false;
      } else {
        break;
      }
    }

    cursor = addDaysToKey(cursor, -1);
  }

  return streak;
}

export function computeWeeklyCompletion(
  weekKeys: string[],
  activeDaysOfWeek: Set<number>,
  completedDateKeys: Set<string>
): { scheduled: number; completed: number; pct: number } {
  let scheduled = 0;
  let completed = 0;

  for (const key of weekKeys) {
    const dow = dateKeyToDayOfWeek(key);
    if (activeDaysOfWeek.has(dow)) {
      scheduled++;
      if (completedDateKeys.has(key)) completed++;
    }
  }

  const pct = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
  return { scheduled, completed, pct };
}
