import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavBar } from "@/components/NavBar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "there";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <span className="text-lg font-semibold text-brand-700">
            FitTracker
          </span>
          <div className="flex items-center gap-4">
            <Link href="/friends" className="text-sm font-medium text-gray-400 hover:text-gray-600">
              Friends
            </Link>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="text-sm font-medium text-gray-400 hover:text-gray-600"
              >
                Sign out ({displayName})
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 pb-24 pt-4">{children}</main>

      <NavBar />
    </div>
  );
}
