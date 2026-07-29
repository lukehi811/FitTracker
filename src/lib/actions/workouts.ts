"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveWorkoutPlan(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const rows = Array.from({ length: 7 }, (_, dow) => ({
    user_id: user.id,
    day_of_week: dow,
    name: String(formData.get(`name_${dow}`) ?? "").trim() || null,
    is_active: formData.get(`active_${dow}`) === "on",
  }));

  await supabase.from("workout_days").upsert(rows, { onConflict: "user_id,day_of_week" });

  revalidatePath("/workouts");
  revalidatePath("/dashboard");
}

export async function toggleCompletion(formData: FormData) {
  const workoutDayId = String(formData.get("workout_day_id") ?? "");
  const date = String(formData.get("date") ?? "");
  if (!workoutDayId || !date) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("workout_completions")
    .select("id")
    .eq("workout_day_id", workoutDayId)
    .eq("completion_date", date)
    .maybeSingle();

  if (existing) {
    await supabase.from("workout_completions").delete().eq("id", existing.id);
  } else {
    await supabase.from("workout_completions").insert({
      user_id: user.id,
      workout_day_id: workoutDayId,
      completion_date: date,
    });
  }

  revalidatePath("/workouts");
  revalidatePath("/dashboard");
}
