import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProgressBar } from "@/components/ProgressBar";
import { getDashboardStats } from "@/lib/dashboardStats";

export default async function FriendDashboardPage({
  params,
}: {
  params: { friendId: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: friendship } = await supabase
    .from("friends")
    .select("id, status")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${user!.id},addressee_id.eq.${params.friendId}),and(addressee_id.eq.${user!.id},requester_id.eq.${params.friendId})`
    )
    .maybeSingle();

  if (!friendship) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Not friends (yet)</h1>
        <p className="text-sm text-gray-500">
          You can only view a dashboard once you&rsquo;re accepted friends.
        </p>
        <Link href="/friends" className="text-sm font-medium text-brand-600">
          Back to Friends →
        </Link>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", params.friendId)
    .maybeSingle();

  const stats = await getDashboardStats(supabase, params.friendId);
  const { scheduled, completed, pct } = stats.weeklyCompletion;
  const name = profile?.display_name ?? "Friend";

  return (
    <div className="space-y-6">
      <div>
        <Link href="/friends" className="text-sm font-medium text-brand-600">
          ← Friends
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{name}&rsquo;s dashboard</h1>
        <p className="text-sm text-gray-500">Read-only</p>
      </div>

      {stats.goal?.goal_text ? (
        <div className="card">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Goal</div>
          <div className="mt-1 text-gray-800">{stats.countdownText ?? stats.goal.goal_text}</div>
        </div>
      ) : (
        <div className="card text-center text-sm text-gray-400">No goal set yet.</div>
      )}

      <div className="card grid grid-cols-2 gap-4 text-center">
        <div>
          <div className="text-3xl font-semibold text-brand-600">{stats.streak}🔥</div>
          <div className="text-sm text-gray-500">day streak</div>
        </div>
        <div>
          <div className="text-3xl font-semibold text-brand-600">{pct}%</div>
          <div className="text-sm text-gray-500">
            this week ({completed}/{scheduled})
          </div>
        </div>
      </div>

      <div className="card space-y-3">
        <h2 className="font-medium text-gray-700">Today&rsquo;s workout</h2>
        {stats.blocksError || stats.blocksMigrationPending ? (
          <p className="text-sm text-gray-400">Not available.</p>
        ) : stats.todayIsScheduled && stats.todayBlock ? (
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-gray-800">
                {stats.todayBlock.title}
              </div>
              <div className="text-xs text-gray-500">
                {stats.todayBlock.exercises.length} exercise
                {stats.todayBlock.exercises.length === 1 ? "" : "s"}
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                stats.todayDone ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"
              }`}
            >
              {stats.todayDone ? "Done ✓" : "Not done yet"}
            </span>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Rest day — no workout scheduled.</p>
        )}
      </div>

      <div className="card space-y-4">
        <h2 className="font-medium text-gray-700">Diet this week</h2>
        <p className="text-sm text-gray-500">
          {stats.dietDaysHit} / {stats.elapsedWeekDays} day{stats.elapsedWeekDays === 1 ? "" : "s"}{" "}
          hit all targets this week
        </p>
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <ProgressBar
            label="Water"
            value={stats.todayLog.water_oz}
            target={stats.targets.water_oz}
            unit="oz"
          />
          <ProgressBar
            label="Sleep"
            value={stats.todayLog.sleep_hours}
            target={stats.targets.sleep_hours}
            unit="hrs"
          />
          <ProgressBar
            label="Protein"
            value={stats.todayLog.protein_g}
            target={stats.targets.protein_g}
            unit="g"
          />
          <ProgressBar
            label="Calories"
            value={stats.todayLog.calories}
            target={stats.targets.calories}
            unit="cal"
          />
        </div>
      </div>
    </div>
  );
}
