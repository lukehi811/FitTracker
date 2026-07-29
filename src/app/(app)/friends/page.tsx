import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { sendFriendRequest, acceptFriendRequest, removeFriend } from "@/lib/actions/friends";

type FriendRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
};

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: { error?: string; notice?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rowsRaw } = await supabase
    .from("friends")
    .select("id, requester_id, addressee_id, status")
    .order("created_at", { ascending: false });

  const rows: FriendRow[] = rowsRaw ?? [];
  const otherIds = rows.map((r) => (r.requester_id === user!.id ? r.addressee_id : r.requester_id));

  const { data: profilesRaw } =
    otherIds.length > 0
      ? await supabase.from("profiles").select("id, display_name, email").in("id", otherIds)
      : { data: [] as { id: string; display_name: string | null; email: string | null }[] };

  const profilesById = new Map((profilesRaw ?? []).map((p) => [p.id, p]));

  function otherPerson(row: FriendRow) {
    const otherId = row.requester_id === user!.id ? row.addressee_id : row.requester_id;
    const profile = profilesById.get(otherId);
    return { id: otherId, name: profile?.display_name ?? profile?.email ?? "Unknown" };
  }

  const accepted = rows.filter((r) => r.status === "accepted");
  const incoming = rows.filter((r) => r.status === "pending" && r.addressee_id === user!.id);
  const sent = rows.filter((r) => r.status === "pending" && r.requester_id === user!.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Friends</h1>
        <p className="text-sm text-gray-500">
          Send a request to view each other&rsquo;s dashboards — read-only, nothing editable.
        </p>
      </div>

      <form action={sendFriendRequest} className="card space-y-3">
        {searchParams.notice && (
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-700">
            {searchParams.notice}
          </p>
        )}
        {searchParams.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {searchParams.error}
          </p>
        )}
        <label className="field-label" htmlFor="email">
          Add a friend by email
        </label>
        <div className="flex gap-2">
          <input
            className="field-input flex-1"
            type="email"
            id="email"
            name="email"
            placeholder="name@example.com"
            required
          />
          <button type="submit" className="btn-primary shrink-0">
            Send
          </button>
        </div>
      </form>

      {incoming.length > 0 && (
        <div className="card space-y-3">
          <h2 className="font-medium text-gray-700">Incoming requests</h2>
          {incoming.map((row) => {
            const other = otherPerson(row);
            return (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5"
              >
                <span className="text-sm font-medium text-gray-800">{other.name}</span>
                <div className="flex gap-2">
                  <form action={acceptFriendRequest}>
                    <input type="hidden" name="friend_id" value={row.id} />
                    <button type="submit" className="btn-primary">
                      Accept
                    </button>
                  </form>
                  <form action={removeFriend}>
                    <input type="hidden" name="friend_id" value={row.id} />
                    <button type="submit" className="btn-secondary">
                      Decline
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {sent.length > 0 && (
        <div className="card space-y-3">
          <h2 className="font-medium text-gray-700">Sent requests</h2>
          {sent.map((row) => {
            const other = otherPerson(row);
            return (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5"
              >
                <span className="text-sm text-gray-700">{other.name}</span>
                <form action={removeFriend}>
                  <input type="hidden" name="friend_id" value={row.id} />
                  <button
                    type="submit"
                    className="text-sm font-medium text-gray-400 hover:text-red-500"
                  >
                    Cancel
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      )}

      <div className="card space-y-3">
        <h2 className="font-medium text-gray-700">Friends</h2>
        {accepted.length === 0 ? (
          <p className="text-sm text-gray-400">No friends yet — add one above.</p>
        ) : (
          accepted.map((row) => {
            const other = otherPerson(row);
            return (
              <Link
                key={row.id}
                href={`/friends/${other.id}`}
                className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5"
              >
                <span className="text-sm font-medium text-gray-800">{other.name}</span>
                <span className="text-sm text-brand-600">View →</span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
