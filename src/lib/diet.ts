import type { DailyValues } from "@/lib/types";

/** A day "hits" its diet targets when every logged value meets or exceeds the target. */
export function isDietDayHit(log: DailyValues, targets: DailyValues): boolean {
  return (
    log.water_oz >= targets.water_oz &&
    log.sleep_hours >= targets.sleep_hours &&
    log.protein_g >= targets.protein_g &&
    log.calories >= targets.calories
  );
}
