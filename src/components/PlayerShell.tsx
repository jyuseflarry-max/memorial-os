"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RadioTower, ListChecks, CheckSquare, BarChart3 } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";

// ── Bottom nav definition ─────────────────────────────────────────────────

const TABS = [
  { label: "Calendar",   href: "/",           icon: RadioTower  },
  { label: "Plans",      href: "/view-plans",  icon: ListChecks  },
  { label: "Vibe Check", href: "/vibe-check",  icon: CheckSquare },
  { label: "Reports",    href: "/reports",     icon: BarChart3   },
] as const;

// ── Shell ─────────────────────────────────────────────────────────────────

export default function PlayerShell({ children }: { children: React.ReactNode }) {
  const pathname   = usePathname();
  const { settings } = useSettings();
  const { authUser } = useAuth();

  const firstName = authUser?.fullName?.split(" ")[0] ?? "Player";

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 font-sans">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-gray-950 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={settings.logo_url || "/mustang-logo.png"}
              alt={settings.program_name}
              width={24}
              height={24}
              className="object-contain"
            />
          </div>
          <span className="text-white font-semibold text-sm tracking-wide">
            {settings.program_name.split(" ")[0]}
          </span>
        </div>
        <Link
          href="/account"
          className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-mustang-red/20 border border-mustang-red/30 flex items-center justify-center">
            <span className="text-mustang-red text-xs font-bold">
              {firstName.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-xs font-mono text-gray-400 hidden sm:block">{firstName}</span>
        </Link>
      </div>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 p-4">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-20 bg-gray-950 border-t border-gray-800">
        <div className="flex">
          {TABS.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
                  active ? "text-mustang-red" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
                <span className="text-[10px] font-mono uppercase tracking-wide">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
