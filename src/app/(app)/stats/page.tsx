import { createClient } from "@/lib/supabase/server";
import { getMonthlyStats } from "@/lib/monthlyStats";

export default async function StatsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { months, blocksMigrationPending, error } = await getMonthlyStats(supabase, user!.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Monthly consistency</h1>
        <p className="text-sm text-gray-500">
          Workout completion and diet-target-hit rate, month by month.
        </p>
      </div>

      {error ? (
        <div className="card text-sm text-red-600">Couldn&rsquo;t load your history right now.</div>
      ) : blocksMigrationPending ? (
        <div className="card text-sm text-amber-600">
          Workout scheduler isn&rsquo;t set up yet — run supabase/migrations/002_workout_blocks.sql.
        </div>
      ) : months.length === 0 ? (
        <div className="card text-sm text-gray-400">
          No history yet — log a day or two, then check back here.
        </div>
      ) : (
        <div className="space-y-3">
          {months.map((m) => (
            <div key={m.monthKey} className="card space-y-3">
              <h2 className="font-medium text-gray-800">{m.label}</h2>

              <div>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="text-gray-600">Workouts</span>
                  <span className="text-gray-500">
                    {m.workout.completed}/{m.workout.scheduled} ({m.workout.pct}%)
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${m.workout.pct}%` }} />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-baseline justify-between text-sm">
                  <span className="text-gray-600">Diet</span>
                  <span className="text-gray-500">
                    {m.diet.hit}/{m.diet.total} ({m.diet.pct}%)
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill bg-sky-400" style={{ width: `${m.diet.pct}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
