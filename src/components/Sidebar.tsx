"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RadioTower,
  Layers,
  Users,
  CalendarDays,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Command Center", href: "/", icon: RadioTower },
  { label: "Drill Vault", href: "/drill-vault", icon: Layers },
  { label: "Player Bio-Stats", href: "/players", icon: Users },
  { label: "Session Planner", href: "/planner", icon: CalendarDays },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-gray-950 border-r border-gray-800 px-4 py-6 shrink-0">
      {/* Logo / Wordmark */}
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
          M
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight tracking-wide">
            Memorial
          </p>
          <p className="text-orange-400 text-xs font-mono uppercase tracking-widest">
            Basketball OS
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-orange-500/15 text-orange-400"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon
                size={18}
                className={active ? "text-orange-400" : "text-gray-500"}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto px-2 pt-6 border-t border-gray-800">
        <p className="text-gray-600 text-xs font-mono">
          SYSTEM STATUS: <span className="text-green-400">NOMINAL</span>
        </p>
      </div>
    </aside>
  );
}
