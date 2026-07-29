export type Exercise = {
  name: string;
  sets: number;
  reps: number;
};

export type WorkoutBlock = {
  id: string;
  day_of_week: number;
  title: string;
  exercises: Exercise[];
};

export type DailyValues = {
  water_oz: number;
  sleep_hours: number;
  protein_g: number;
  calories: number;
};

export const DEFAULT_TARGETS: DailyValues = {
  water_oz: 64,
  sleep_hours: 8,
  protein_g: 150,
  calories: 2000,
};

export function isBlockScheduled(block: Pick<WorkoutBlock, "title">): boolean {
  return block.title.trim().toLowerCase() !== "rest day";
}
