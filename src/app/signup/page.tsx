import Link from "next/link";
import { signUp } from "@/lib/actions/auth";

export default function SignupPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-center text-2xl font-semibold text-brand-700">
          FitTracker
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Set up your account. (Just for Luke &amp; Dallin.)
        </p>

        <form action={signUp} className="card space-y-4">
          {searchParams.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {searchParams.error}
            </p>
          )}

          <div>
            <label className="field-label" htmlFor="display_name">
              Name
            </label>
            <input
              className="field-input"
              id="display_name"
              name="display_name"
              type="text"
              placeholder="Luke or Dallin"
              autoComplete="name"
              required
            />
          </div>

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
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          <button type="submit" className="btn-primary w-full">
            Create account
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
