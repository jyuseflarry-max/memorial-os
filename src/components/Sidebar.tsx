"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  ChevronDown,
  Dumbbell,
  Lock,
  Settings,
} from "lucide-react";
import { usePlayers } from "@/context/PlayerContext";
import { useTeam } from "@/context/TeamContext";
import { useSettings } from "@/context/SettingsContext";

// ── Nav structure ─────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: "Players",
    icon: Users,
    items: [
      { label: "Player Vibe",        href: "/players",       icon: Users,     staff: false },
      { label: "Manage Roster",     href: "/admin/roster",  icon: UserCog,   staff: true  },
      { label: "Manage Teams",      href: "/admin/teams",   icon: Users,     staff: true  },
    ],
  },
  {
    label: "Practice",
    icon: Dumbbell,
    items: [
      { label: "Command Center",    href: "/",            icon: RadioTower,   staff: false },
      { label: "Calendar",           href: "/calendar",    icon: Calendar,     staff: false },
      { label: "Planner",            href: "/planner",     icon: CalendarDays, staff: false },
      { label: "Drill Vault",       href: "/drill-vault", icon: Layers,       staff: false },
    ],
  },
];

// ── Collapsible nav group ─────────────────────────────────────────────────

function NavGroup({
  label,
  icon: GroupIcon,
  items,
  pathname,
}: {
  label: string;
  icon: React.ElementType;
  items: { label: string; href: string; icon: React.ElementType; staff: boolean }[];
  pathname: string;
}) {
  const hasActive = items.some((i) => i.href === pathname);
  const [open, setOpen] = useState(true);

  return (
    <div>
      {/* Group header */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-mono uppercase tracking-widest transition-colors text-gray-500 hover:text-gray-300 hover:bg-gray-800/60"
      >
        <div className="flex items-center gap-2">
          <GroupIcon size={13} className={hasActive ? "text-mustang-red" : "text-gray-600"} />
          <span className={hasActive ? "text-mustang-red" : ""}>{label}</span>
        </div>
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
        />
      </button>

      {/* Items */}
      {open && (
        <div className="mt-0.5 ml-2 pl-3 border-l border-gray-800 flex flex-col gap-0.5">
          {items.map(({ label, href, icon: Icon, staff }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? "bg-mustang-red/15 text-mustang-red"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon size={14} className={active ? "text-mustang-red" : "text-gray-500"} />
                <span className="flex-1">{label}</span>
                {staff && (
                  <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded-full">
                    <Lock size={8} />
                    Staff
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { dbConnected, dbError, loading } = usePlayers();
  const { teams, activeTeam, setActiveTeam } = useTeam();
  const { settings } = useSettings();

  function handleTeamSelect(team: typeof teams[number]) {
    setActiveTeam(team);
    if (pathname === "/planner") router.push("/");
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-gray-950 border-r border-gray-800 px-4 py-6 shrink-0 print:hidden">
      {/* Logo / Wordmark */}
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden">
          {settings.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logo_url} alt="Program logo" className="w-full h-full object-contain" />
          ) : (
            <Image src="/mustang-logo.png" alt="Memorial Mustangs" width={32} height={32} priority />
          )}
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight tracking-wide">{settings.program_name.split(" ")[0]}</p>
          <p className="text-mustang-red text-xs font-mono uppercase tracking-widest">{settings.program_name.split(" ").slice(1).join(" ") || "Basketball OS"}</p>
        </div>
      </div>

      {/* Team switcher */}
      {teams.length > 0 && (
        <div className="mb-6 px-1">
          <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest mb-1.5 px-1">Active Team</p>
          <div className="flex flex-col gap-1">
            {teams.map((team) => (
              <button
                key={team.id}
                type="button"
                onClick={() => handleTeamSelect(team)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTeam?.id === team.id
                    ? "bg-mustang-red text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {team.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Collapsible nav groups */}
      <nav className="flex flex-col gap-3">
        {NAV_GROUPS.map((group) => (
          <NavGroup
            key={group.label}
            label={group.label}
            icon={group.icon}
            items={group.items}
            pathname={pathname}
          />
        ))}
      </nav>

      {/* Settings link */}
      <div className="mt-auto px-1 pb-3">
        <Link
          href="/settings"
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            pathname === "/settings"
              ? "bg-mustang-red/15 text-mustang-red"
              : "text-gray-500 hover:bg-gray-800 hover:text-gray-300"
          }`}
        >
          <Settings size={14} className={pathname === "/settings" ? "text-mustang-red" : "text-gray-600"} />
          Settings
        </Link>
      </div>

      {/* Footer — live DB status */}
      <div className="px-2 pt-4 border-t border-gray-800 flex flex-col gap-2">
        {loading && !dbConnected ? (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
            <Loader2 size={10} className="animate-spin" /> CONNECTING…
          </div>
        ) : dbConnected ? (
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-green-400">
            <Wifi size={10} /> DB CONNECTED
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-red-400">
              <WifiOff size={10} /> DB OFFLINE
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
