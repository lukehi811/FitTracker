import Link from "next/link";
import { signIn } from "@/lib/actions/auth";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; notice?: string };
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-semibold text-brand-700">
          FitTracker
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Log in to keep your streak going.
        </p>

        <form action={signIn} className="card space-y-4">
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

          <div>
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input
              className="field-input"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <input
              className="field-input"
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            Log in
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          New here?{" "}
          <Link href="/signup" className="font-medium text-brand-600">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
