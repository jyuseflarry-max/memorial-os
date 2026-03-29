"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  RadioTower,
  Layers,
  Users,
  UsersRound,
  UserCog,
  BarChart3,
  Wifi,
  WifiOff,
  Loader2,
  ChevronDown,
  Dumbbell,
  Lock,
  Settings,
  Swords,
  Gamepad2,
  Flame,
  Trophy,
  X,
  Sparkles,
  ListChecks,
  LogOut,
  CircleUser,
  CalendarDays,
  MapPin,
  MessageSquare,
} from "lucide-react";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";
import { logout } from "@/actions/auth";
import { usePlayers } from "@/context/PlayerContext";
import { useTeam } from "@/context/TeamContext";
import { useSettings } from "@/context/SettingsContext";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

// ── Nav structure ─────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: "Players",
    icon: Users,
    items: [
      { label: "Vibe Check", href: "/vibe-check",   icon: Users,      staff: false, playerOk: true,  coachHide: true  },
      { label: "Vibe Check", href: "/players",       icon: Users,      staff: false, playerOk: false, coachHide: false },
      { label: "Groups",     href: "/player-groups", icon: UsersRound, staff: false, playerOk: false, coachHide: false },
      { label: "Roster",     href: "/admin/roster",     icon: UserCog,    staff: true,  playerOk: false, coachHide: false },
      { label: "Teams",      href: "/admin/teams",      icon: Users,      staff: true,  playerOk: false, coachHide: false },
      { label: "Users",      href: "/admin/users",      icon: UsersRound, staff: true,  playerOk: false, coachHide: false },
      { label: "Locations",  href: "/admin/locations",  icon: MapPin,     staff: true,  playerOk: false, coachHide: false },
    ],
  },
  {
    label: "Practice",
    icon: Dumbbell,
    items: [
      { label: "Build a Plan", href: "/build-a-plan", icon: Sparkles,   staff: false, playerOk: false, coachHide: false },
      { label: "View Plans",   href: "/view-plans",   icon: ListChecks, staff: false, playerOk: true,  coachHide: false },
      { label: "Drill Vault",  href: "/drill-vault",  icon: Layers,     staff: false, playerOk: false, coachHide: false },
    ],
  },
  {
    label: "Reports",
    icon: BarChart3,
    items: [
      { label: "Category Breakdown", href: "/reports", icon: BarChart3, staff: false, playerOk: false, coachHide: false },
    ],
  },
  {
    label: "Schedules",
    icon: Swords,
    items: [
      { label: "Game",        href: "/schedules/game",     icon: Gamepad2,    staff: false, playerOk: true,  coachHide: false },
      { label: "Practice",    href: "/schedules/practice", icon: Dumbbell,    staff: false, playerOk: false, coachHide: false },
      { label: "Weekly View", href: "/schedules/weekly",   icon: CalendarDays, staff: false, playerOk: true,  coachHide: false },
      { label: "Calendar",    href: "/",                   icon: RadioTower,  staff: false, playerOk: true,  coachHide: false },
    ],
  },
  {
    label: "Strength",
    icon: Flame,
    items: [
      { label: "Armory",   href: "/admin/strength/maxes",    icon: Trophy,   staff: true, playerOk: false, coachHide: false },
      { label: "Designer", href: "/admin/strength/designer", icon: Dumbbell, staff: true, playerOk: false, coachHide: false },
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
}: {
  label: string;
  icon: React.ElementType;
  items: { label: string; href: string; icon: React.ElementType; staff: boolean; playerOk: boolean; coachHide: boolean }[];
  pathname: string;
  onClose: () => void;
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
          <GroupIcon size={13} className={hasActive ? "text-coaches-blue" : "text-gray-600"} />
          <span className={hasActive ? "text-coaches-blue" : ""}>{label}</span>
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
                onClick={onClose}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active
                    ? "bg-coaches-blue/15 text-coaches-blue"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                <Icon size={14} className={active ? "text-coaches-blue" : "text-gray-500"} />
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

export default function Sidebar({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const router   = useRouter();
  const { dbConnected, dbError, loading } = usePlayers();
  const { teams, activeTeam, setActiveTeam } = useTeam();
  const { settings } = useSettings();
  const unread = useUnreadMessages();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole,  setUserRole]  = useState<string | null>(null);

  useEffect(() => {
    const sb = getSupabaseBrowser();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setUserEmail(user.email ?? null);
      const { data } = await sb.from("users").select("role").eq("id", user.id).single();
      if (data) setUserRole(data.role);
    });
  }, []);

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
      {teams.length > 0 && userRole !== "Player" && (
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
      <nav className="flex flex-col gap-3">
        {NAV_GROUPS
          .filter((g) => (settings.enabled_modules ?? []).includes(g.label))
          .map((group) => {
            const isPlayer = userRole === "Player";
            const visibleItems = isPlayer
              ? group.items.filter((i) => i.playerOk)
              : group.items.filter((i) => !i.coachHide);
            if (visibleItems.length === 0) return null;
            return (
              <NavGroup
                key={group.label}
                label={group.label}
                icon={group.icon}
                items={visibleItems}
                pathname={pathname}
                onClose={onClose}
              />
            );
          })}
      </nav>

      {/* Messages + Settings links */}
      <div className="mt-auto px-1 pb-1 flex flex-col gap-0.5">
        <Link
          href="/messages"
          onClick={onClose}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            pathname.startsWith("/messages")
              ? "bg-coaches-blue/15 text-coaches-blue"
              : "text-gray-500 hover:bg-gray-800 hover:text-gray-300"
          }`}
        >
          <MessageSquare size={14} className={pathname.startsWith("/messages") ? "text-coaches-blue" : "text-gray-600"} />
          Messages
          {unread > 0 && (
            <span className="ml-auto min-w-[18px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
        {userRole !== "Player" && (
          <Link
            href="/settings"
            onClick={onClose}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              pathname === "/settings"
                ? "bg-coaches-blue/15 text-coaches-blue"
                : "text-gray-500 hover:bg-gray-800 hover:text-gray-300"
            }`}
          >
            <Settings size={14} className={pathname === "/settings" ? "text-coaches-blue" : "text-gray-600"} />
            Settings
          </Link>
        )}
      </div>

      {/* User account section */}
      {userEmail && (
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
            <span className="flex-1 truncate">{userEmail}</span>
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
