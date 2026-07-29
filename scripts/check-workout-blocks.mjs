#!/usr/bin/env node
// Throwaway diagnostic: checks whether migration 002 (workout_blocks) has
// actually been applied to your live Supabase project, and whether the
// signed-up users have rows in it.
//
// Uses the SERVICE ROLE key (not the anon key) so it bypasses RLS entirely
// and shows the real state of the table regardless of who's "logged in" —
// the anon key alone would just get blocked by RLS and falsely look like
// "no data" even if the migration ran fine.
//
// Get the service role key from: Supabase dashboard -> Project Settings ->
// API -> service_role (the "secret" one, not "anon public").
//
// Run:
//   SUPABASE_URL=https://xxxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=eyJ... \
//   node scripts/check-workout-blocks.mjs
//
// Never put the service role key in .env.local or commit it anywhere — it
// bypasses every RLS policy in the project. Pass it inline as shown above
// so it only ever lives in your shell history, then delete this script (or
// keep it — it's harmless with no secrets embedded) once you're done.

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY env vars.\n\n" +
      "Run:\n" +
      "  SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/check-workout-blocks.mjs"
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log("Checking whether workout_blocks exists and is populated...\n");

  const { data: blocks, error: blocksError } = await supabase
    .from("workout_blocks")
    .select("id, user_id, day_of_week, title, exercises");

  if (blocksError) {
    console.log("FAILED: query against workout_blocks errored out.");
    console.log(`  code: ${blocksError.code ?? "(none)"}`);
    console.log(`  message: ${blocksError.message}`);

    if (
      blocksError.code === "42P01" ||
      blocksError.code === "PGRST205" ||
      /does not exist|schema cache/i.test(blocksError.message)
    ) {
      console.log(
        "\n=> The table doesn't exist. supabase/migrations/002_workout_blocks.sql " +
          "has NOT been run against this project yet. Run it in the Supabase SQL editor."
      );
    } else if (blocksError.code === "42501" || /permission denied|policy/i.test(blocksError.message)) {
      console.log(
        "\n=> This looks like a permissions/RLS problem, which is unusual for the " +
          "service role key (it bypasses RLS). Double check the key you passed is " +
          "actually the service_role key, not the anon key."
      );
    }
    process.exit(1);
  }

  console.log(`OK: workout_blocks exists. Total rows across all users: ${blocks.length}\n`);

  const { data: usersResp, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) {
    console.log("Couldn't list users to label rows by email:", usersError.message);
    console.log(blocks);
    return;
  }

  const byUser = new Map();
  for (const b of blocks) {
    const list = byUser.get(b.user_id) ?? [];
    list.push(b);
    byUser.set(b.user_id, list);
  }

  console.log("Per-user breakdown:");
  for (const user of usersResp.users) {
    const rows = byUser.get(user.id) ?? [];
    console.log(`\n  ${user.email}  (${user.id})`);
    if (rows.length === 0) {
      console.log("    WARNING: 0 rows — this user has no workout_blocks at all.");
      console.log(
        "    This user was likely created before the migration's backfill ran. " +
          "Re-running the backfill INSERT in 002_workout_blocks.sql (it's idempotent, " +
          "uses ON CONFLICT DO NOTHING) will fix it."
      );
    } else {
      const days = rows.map((r) => r.day_of_week).sort((a, b) => a - b);
      console.log(`    ${rows.length} row(s). day_of_week values present: ${days.join(", ")}`);
      const missing = [0, 1, 2, 3, 4, 5, 6].filter((d) => !days.includes(d));
      if (missing.length > 0) {
        console.log(`    WARNING: missing day_of_week: ${missing.join(", ")} (expected all 7, 0-6)`);
      } else {
        console.log("    All 7 days present.");
      }
    }
  }

  const orphanUserIds = [...byUser.keys()].filter(
    (id) => !usersResp.users.some((u) => u.id === id)
  );
  if (orphanUserIds.length > 0) {
    console.log(
      `\nWARNING: ${orphanUserIds.length} block(s) reference a user_id not found in auth.users:`,
      orphanUserIds
    );
  }
}

main().catch((err) => {
  console.error("Unexpected error running diagnostic:", err);
  process.exit(1);
});
