"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  RadioTower,
  Layers,
  Users,
  CalendarDays,
  Calendar,
  UserCog,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import { usePlayers } from "@/context/PlayerContext";

const NAV_ITEMS = [
  { label: "Command Center",   href: "/",          icon: RadioTower  },
  { label: "Drill Vault",      href: "/drill-vault", icon: Layers    },
  { label: "Player Bio-Stats", href: "/players",   icon: Users       },
  { label: "Practice Calendar",href: "/calendar",  icon: Calendar    },
  { label: "Session Planner",  href: "/planner",   icon: CalendarDays},
];

export default function Sidebar() {
  const pathname = usePathname();
  const { dbConnected, dbError, loading } = usePlayers();

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-gray-950 border-r border-gray-800 px-4 py-6 shrink-0">
      {/* Logo / Wordmark */}
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden">
          <Image
            src="/mustang-logo.png"
            alt="Memorial Mustangs"
            width={32}
            height={32}
            priority
          />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight tracking-wide">
            Memorial
          </p>
          <p className="text-mustang-red text-xs font-mono uppercase tracking-widest">
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
                  ? "bg-mustang-red/15 text-mustang-red"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <Icon
                size={18}
                className={active ? "text-mustang-red" : "text-gray-500"}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Staff Only */}
      <div className="mt-6 pt-5 border-t border-gray-800">
        <p className="text-gray-600 text-[10px] font-mono uppercase tracking-widest px-3 mb-1">
          Staff Only
        </p>
        {(() => {
          const href = "/admin/roster";
          const active = pathname === href;
          return (
            <Link
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-mustang-red/15 text-mustang-red"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <UserCog
                size={18}
                className={active ? "text-mustang-red" : "text-gray-500"}
              />
              Manage Roster
            </Link>
          );
        })()}
      </div>

      {/* Footer — live DB status */}
      <div className="mt-auto px-2 pt-6 border-t border-gray-800 flex flex-col gap-2">
        {loading && !dbConnected ? (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
            <Loader2 size={10} className="animate-spin" />
            CONNECTING…
          </div>
        ) : dbConnected ? (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-green-400">
            <Wifi size={10} />
            DB CONNECTED
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-red-400">
              <WifiOff size={10} />
              DB OFFLINE
            </div>
            {dbError && (
              <p className="text-[9px] font-mono text-red-500/70 leading-tight break-words">
                {dbError.slice(0, 60)}
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
