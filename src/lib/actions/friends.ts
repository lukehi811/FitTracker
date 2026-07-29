"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function sendFriendRequest(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  if (!email) {
    redirect(`/friends?error=${encodeURIComponent("Enter an email address.")}`);
  }

  const { data: me } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .maybeSingle();

  if (me?.email && me.email.toLowerCase() === email) {
    redirect(`/friends?error=${encodeURIComponent("That's your own email.")}`);
  }

  const { data: target, error: lookupError } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    redirect(`/friends?error=${encodeURIComponent("Couldn't look that up — please try again.")}`);
  }

  if (!target) {
    redirect(`/friends?error=${encodeURIComponent("No FitTracker account with that email.")}`);
  }

  const { error } = await supabase.from("friends").insert({
    requester_id: user.id,
    addressee_id: target!.id,
    status: "pending",
  });

  if (error) {
    const message =
      error.code === "23505"
        ? "You're already friends or have a pending request with that person."
        : error.message;
    redirect(`/friends?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/friends");
  redirect(
    `/friends?notice=${encodeURIComponent(`Friend request sent to ${target!.display_name ?? email}.`)}`
  );
}

export async function acceptFriendRequest(formData: FormData) {
  const id = String(formData.get("friend_id") ?? "");
  if (!id) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("friends")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/friends");
}

/** Covers declining an incoming request, cancelling a sent one, or unfriending. */
export async function removeFriend(formData: FormData) {
  const id = String(formData.get("friend_id") ?? "");
  if (!id) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("friends").delete().eq("id", id);

  revalidatePath("/friends");
}
