export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-50 px-4">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <div className="animate-fit-halo absolute inset-0 rounded-full bg-brand-200" />

        <svg
          viewBox="0 0 160 80"
          className="relative h-16 w-16"
          aria-hidden="true"
        >
          <line
            x1="20"
            y1="14"
            x2="10"
            y2="8"
            className="animate-fit-swoosh stroke-brand-300"
            strokeWidth="4"
            strokeLinecap="round"
            style={{ animationDelay: "0.15s" }}
          />
          <line
            x1="20"
            y1="66"
            x2="10"
            y2="72"
            className="animate-fit-swoosh stroke-brand-300"
            strokeWidth="4"
            strokeLinecap="round"
            style={{ animationDelay: "0.35s" }}
          />

          <g className="animate-fit-lift">
            <rect x="55" y="35" width="50" height="10" rx="5" className="fill-brand-700" />
            <rect x="14" y="14" width="16" height="52" rx="7" className="fill-brand-500" />
            <rect x="32" y="22" width="11" height="36" rx="5" className="fill-brand-600" />
            <rect x="130" y="14" width="16" height="52" rx="7" className="fill-brand-500" />
            <rect x="117" y="22" width="11" height="36" rx="5" className="fill-brand-600" />
          </g>
        </svg>
      </div>

      <p className="flex items-center gap-2 text-sm font-medium text-gray-500">
        Loading your gains
        <span className="flex gap-0.5">
          <span className="animate-fit-dot inline-block h-1.5 w-1.5 rounded-full bg-brand-500" />
          <span
            className="animate-fit-dot inline-block h-1.5 w-1.5 rounded-full bg-brand-500"
            style={{ animationDelay: "0.15s" }}
          />
          <span
            className="animate-fit-dot inline-block h-1.5 w-1.5 rounded-full bg-brand-500"
            style={{ animationDelay: "0.3s" }}
          />
        </span>
      </p>
    </div>
  );
}
