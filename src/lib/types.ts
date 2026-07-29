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
