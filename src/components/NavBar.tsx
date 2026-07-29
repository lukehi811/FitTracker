"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/daily", label: "Daily", icon: "📝" },
  { href: "/workouts", label: "Workouts", icon: "💪" },
  { href: "/goals", label: "Goal", icon: "🎯" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-100 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md items-stretch justify-between">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <li key={link.href} className="flex-1">
              <Link
                href={link.href}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                  active ? "text-brand-600" : "text-gray-400"
                }`}
              >
                <span className="text-xl leading-none">{link.icon}</span>
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
