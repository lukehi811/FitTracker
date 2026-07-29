"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveGoal(formData: FormData) {
  const goalText = String(formData.get("goal_text") ?? "").trim();
  const targetDateRaw = String(formData.get("target_date") ?? "").trim();
  const targetDate = targetDateRaw.length > 0 ? targetDateRaw : null;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (goalText.length === 0) {
    await supabase.from("goals").delete().eq("user_id", user.id);
  } else {
    await supabase.from("goals").upsert({
      user_id: user.id,
      goal_text: goalText,
      target_date: targetDate,
      updated_at: new Date().toISOString(),
    });
  }

  revalidatePath("/goals");
  revalidatePath("/dashboard");
}
