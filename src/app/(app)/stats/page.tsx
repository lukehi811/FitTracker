import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CalendarMonth } from "@/components/CalendarMonth";
import { addMonthsToKey, getMonthCalendar, isValidMonthKey } from "@/lib/calendarStats";
import { todayKey } from "@/lib/dates";

export default async function StatsPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = todayKey();
  const currentMonth = today.slice(0, 7);
  const monthKey = isValidMonthKey(searchParams.month) ? searchParams.month : currentMonth;

  const calendar = await getMonthCalendar(supabase, user!.id, monthKey);
  const prevMonth = addMonthsToKey(monthKey, -1);
  const nextMonth = addMonthsToKey(monthKey, 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Stats</h1>
        <p className="text-sm text-gray-500">Tap a day for details.</p>
      </div>

      {calendar.error ? (
        <div className="card text-sm text-red-600">Couldn&rsquo;t load your history right now.</div>
      ) : calendar.blocksMigrationPending ? (
        <div className="card text-sm text-amber-600">
          Workout scheduler isn&rsquo;t set up yet — run supabase/migrations/002_workout_blocks.sql.
        </div>
      ) : (
        <>
          <div className="card">
            <div className="flex items-center justify-between">
              <Link
                href={`/stats?month=${prevMonth}`}
                aria-label="Previous month"
                className="rounded-lg px-2 py-1 text-lg text-gray-400 hover:text-gray-600"
              >
                ←
              </Link>
              <h2 className="font-medium text-gray-800">{calendar.label}</h2>
              <Link
                href={`/stats?month=${nextMonth}`}
                aria-label="Next month"
                className="rounded-lg px-2 py-1 text-lg text-gray-400 hover:text-gray-600"
              >
                →
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-center text-sm">
              <div>
                <div className="text-xl font-semibold text-green-600">
                  {calendar.summary.fullCount}
                </div>
                <div className="text-gray-500">full days</div>
              </div>
              <div>
                <div className="text-xl font-semibold text-yellow-500">
                  {calendar.summary.partialCount}
                </div>
                <div className="text-gray-500">partial days</div>
              </div>
              <div>
                <div className="text-xl font-semibold text-brand-600">
                  {calendar.summary.workoutPct}%
                </div>
                <div className="text-gray-500">
                  workouts ({calendar.summary.workoutCompleted}/{calendar.summary.workoutScheduled})
                </div>
              </div>
              <div>
                <div className="text-xl font-semibold text-brand-600">{calendar.summary.dietPct}%</div>
                <div className="text-gray-500">diet on target</div>
              </div>
            </div>
          </div>

          <div className="card">
            <CalendarMonth weeks={calendar.weeks} today={today} />
          </div>
        </>
      )}
    </div>
  );
}
