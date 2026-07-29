"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayKey } from "@/lib/dates";

function num(formData: FormData, key: string): number {
  const raw = formData.get(key);
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export async function saveTargets(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("daily_targets").upsert({
    user_id: user.id,
    water_oz: num(formData, "water_oz"),
    sleep_hours: num(formData, "sleep_hours"),
    protein_g: num(formData, "protein_g"),
    calories: num(formData, "calories"),
    updated_at: new Date().toISOString(),
  });

  revalidatePath("/daily");
  revalidatePath("/dashboard");
}

export async function saveLog(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("daily_logs").upsert(
    {
      user_id: user.id,
      log_date: todayKey(),
      water_oz: num(formData, "water_oz"),
      sleep_hours: num(formData, "sleep_hours"),
      protein_g: num(formData, "protein_g"),
      calories: num(formData, "calories"),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,log_date" }
  );

  revalidatePath("/daily");
  revalidatePath("/dashboard");
}
