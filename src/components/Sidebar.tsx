"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Layers,
  Users,
  UsersRound,
  BarChart3,
  Wifi,
  WifiOff,
  Loader2,
  ChevronDown,
  Dumbbell,
  Swords,
  Gamepad2,
  X,
  Sparkles,
  ListChecks,
  LogOut,
  CircleUser,
  CalendarDays,
  MessageSquare,
  ShieldCheck,
  Flame,
  Trophy,
  Zap,
  Package,
} from "lucide-react";
import { logout } from "@/actions/auth";
import { usePlayers } from "@/context/PlayerContext";
import { useTeam } from "@/context/TeamContext";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/context/PermissionsContext";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

// ── Nav structure ─────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: "Messages",
    icon: MessageSquare,
    alwaysShow: true,
    items: [
      { label: "Messages", href: "/messages", icon: MessageSquare, pageKey: "messages" },
    ],
  },
  {
    label: "Players",
    icon: Users,
    items: [
      { label: "Roster",    href: "/players",            icon: Users,      pageKey: "roster" },
      { label: "Readiness", href: "/strength/readiness", icon: Zap,        pageKey: "readiness" },
      { label: "Groups",    href: "/player-groups",      icon: UsersRound, pageKey: "player_groups" },
    ],
  },
  {
    label: "Practice",
    icon: Dumbbell,
    items: [
      { label: "Build a Plan", href: "/build-a-plan", icon: Sparkles,   pageKey: "build_plan" },
      { label: "View Plans",   href: "/view-plans",   icon: ListChecks, pageKey: "view_plans" },
      { label: "Drill Vault",  href: "/drill-vault",  icon: Layers,     pageKey: "drill_vault" },
    ],
  },
  {
    label: "Reports",
    icon: BarChart3,
    items: [
      { label: "Practice Time", href: "/reports",            icon: BarChart3, pageKey: "reports" },
      { label: "Attendance",    href: "/reports/attendance", icon: Users,     pageKey: "attendance_report" },
    ],
  },
  {
    label: "Schedules",
    icon: Swords,
    items: [
      { label: "Game",        href: "/schedules/game",     icon: Gamepad2,     pageKey: "game_schedule" },
      { label: "Practice",    href: "/schedules/practice", icon: Dumbbell,     pageKey: "practice_schedule" },
      { label: "Weekly View", href: "/schedules/weekly",   icon: CalendarDays, pageKey: "weekly_schedule" },
    ],
  },
  {
    label: "Strength",
    icon: Flame,
    items: [
      { label: "Dashboard",   href: "/strength",             icon: Flame,    pageKey: "strength" },
      { label: "Leaderboard", href: "/strength/leaderboard", icon: Trophy,   pageKey: "leaderboard" },
      { label: "Programs",    href: "/strength/programs",    icon: Dumbbell, pageKey: "strength_programs" },
    ],
  },
  {
    label: "Inventory",
    icon: Package,
    items: [
      { label: "Equipment",  href: "/inventory",       icon: Package, pageKey: "inventory" },
      { label: "Full Audit", href: "/inventory/audit", icon: Package, pageKey: "inventory_audit" },
    ],
  },
  {
    label: "Settings",
    icon: ShieldCheck,
    alwaysShow: true,
    items: [
      { label: "Settings", href: "/admin", icon: ShieldCheck, pageKey: "settings" },
    ],
  },
];

// ── Collapsible nav group ─────────────────────────────────────────────────

function NavGroup({
  label,
  icon: GroupIcon,
  items,
  pathname,
  onClose,
  badge,
}: {
  label: string;
  icon: React.ElementType;
  items: { label: string; href: string; icon: React.ElementType; pageKey: string }[];
  pathname: string;
  onClose: () => void;
  badge?: number;
}) {
  const hasActive = items.some((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
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
          <GroupIcon size={13} className={hasActive ? "text-coaches-blue" : "text-gray-600"} />
          <span className={hasActive ? "text-coaches-blue" : ""}>{label}</span>
          {badge != null && badge > 0 && (
            <span className="min-w-[18px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </div>
        <ChevronDown
          size={13}
          className={`transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`}
        />
      </button>

      {/* Items */}
      {open && (
        <div className="mt-0.5 ml-2 pl-3 border-l border-gray-800 flex flex-col gap-0.5">
          {items.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? "bg-coaches-blue/15 text-coaches-blue"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon size={14} className={active ? "text-coaches-blue" : "text-gray-500"} />
                <span className="flex-1">{label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────

export default function Sidebar({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { dbConnected, dbError, loading } = usePlayers();
  const { teams, activeTeam, setActiveTeam } = useTeam();
  const { settings } = useSettings();
  const { authUser } = useAuth();
  const { canView } = usePermissions();
  const unread = useUnreadMessages();

  function handleTeamSelect(team: typeof teams[number]) {
    setActiveTeam(team);
    onClose();
    if (pathname === "/planner") router.push("/");
  }

  return (
    <aside className="flex flex-col w-64 h-full min-h-screen bg-gray-950 border-r border-gray-800 px-4 py-6 shrink-0 overflow-y-auto">
      {/* Logo / Wordmark + mobile close button */}
      <div className="flex items-center gap-3 mb-8 px-2">
        {settings.logo_url ? (
          /* Tenant custom logo + program name */
          <>
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={settings.logo_url} alt="Program logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-tight tracking-wide">{settings.program_name.split(" ")[0]}</p>
              <p className="text-coaches-blue text-xs font-mono uppercase tracking-widest">{settings.program_name.split(" ").slice(1).join(" ") || "Coach's OS"}</p>
            </div>
          </>
        ) : (
          /* Platform default — Coach's OS logo */
          <div className="flex-1 min-w-0">
            <Image src="/thecoachsOS.jpg" alt="The Coach's OS" width={180} height={72} className="w-full h-auto object-contain rounded-lg" priority />
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors shrink-0"
          aria-label="Close navigation"
        >
          <X size={16} />
        </button>
      </div>

      {/* Team switcher — hidden for players (they are auto-locked to their team) */}
      {teams.length > 0 && authUser?.role !== "Player" && (
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
                    ? "bg-coaches-blue text-white"
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
      <nav className="flex flex-col gap-3 flex-1">
        {NAV_GROUPS
          .filter((g) => {
            if ("alwaysShow" in g && g.alwaysShow) return true;
            return (settings.enabled_modules ?? []).includes(g.label);
          })
          .map((group) => {
            const visibleItems = group.items.filter((i) => canView(i.pageKey));
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label} className={group.label === "Settings" ? "mt-auto" : undefined}>
                <NavGroup
                  label={group.label}
                  icon={group.icon}
                  items={visibleItems}
                  pathname={pathname}
                  onClose={onClose}
                  badge={group.label === "Messages" ? unread : undefined}
                />
              </div>
            );
          })}
      </nav>

      {/* User account section */}
      {authUser?.email && (
        <div className="px-1 pb-3 flex flex-col gap-0.5">
          <Link
            href="/account"
            onClick={onClose}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              pathname === "/account"
                ? "bg-coaches-blue/15 text-coaches-blue"
                : "text-gray-500 hover:bg-gray-800 hover:text-gray-300"
            }`}
          >
            <CircleUser size={14} className={pathname === "/account" ? "text-coaches-blue" : "text-gray-600"} />
            <span className="flex-1 truncate">{authUser.email}</span>
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-800 hover:text-red-400 transition-colors"
            >
              <LogOut size={14} className="text-gray-600" />
              Sign out
            </button>
          </form>
        </div>
      )}

      {/* Coach's OS platform attribution — always visible */}
      <div className="px-2 pb-3">
        <div className="border-t border-gray-800/60 pt-3 flex flex-col items-center gap-1">
          <p className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">Powered by</p>
          <Image src="/thecoachsOS.jpg" alt="The Coach's OS" width={140} height={56} className="w-full max-w-[140px] h-auto object-contain rounded opacity-70 hover:opacity-100 transition-opacity" />
        </div>
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
