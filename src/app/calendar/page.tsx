"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays, Dumbbell } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useTeam } from "@/context/TeamContext";
import { Team } from "@/types/team";

interface SavedSession {
  id: string;
  date: string;        // YYYY-MM-DD
  start_time: string;
  drills: unknown[];
  team_id: string | null;
}

// Color palette — one per team (index-based, wraps if >6 teams)
const TEAM_COLORS = [
  { dot: "bg-mustang-red",   text: "text-mustang-red",   border: "border-mustang-red/30",   bg: "bg-mustang-red/10"   },
  { dot: "bg-sky-400",       text: "text-sky-400",       border: "border-sky-400/30",       bg: "bg-sky-400/10"       },
  { dot: "bg-emerald-400",   text: "text-emerald-400",   border: "border-emerald-400/30",   bg: "bg-emerald-400/10"   },
  { dot: "bg-amber-400",     text: "text-amber-400",     border: "border-amber-400/30",     bg: "bg-amber-400/10"     },
  { dot: "bg-purple-400",    text: "text-purple-400",    border: "border-purple-400/30",    bg: "bg-purple-400/10"    },
  { dot: "bg-pink-400",      text: "text-pink-400",      border: "border-pink-400/30",      bg: "bg-pink-400/10"      },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS   = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function isoToday(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDisplayDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

export default function CalendarPage() {
  const router   = useRouter();
  const today    = isoToday();
  const { teams } = useTeam();

  const [year,  setYear]    = useState(() => new Date().getFullYear());
  const [month, setMonth]   = useState(() => new Date().getMonth()); // 0-indexed
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filterTeamId, setFilterTeamId] = useState<string | null>(null); // null = All
  const [dayPopover, setDayPopover] = useState<{ iso: string; sessions: SavedSession[] } | null>(null);

  // Assign a stable color index per team
  const teamColorMap = useMemo(() => {
    const map: Record<string, number> = {};
    teams.forEach((t, i) => { map[t.id] = i % TEAM_COLORS.length; });
    return map;
  }, [teams]);

  function colorFor(teamId: string | null) {
    if (!teamId) return TEAM_COLORS[0];
    const idx = teamColorMap[teamId] ?? 0;
    return TEAM_COLORS[idx];
  }

  // Fetch ALL sessions (no team filter on API)
  useEffect(() => {
    setLoading(true);
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setSessions(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Apply filter for display
  const visibleSessions = useMemo(
    () => filterTeamId ? sessions.filter((s) => s.team_id === filterTeamId) : sessions,
    [sessions, filterTeamId]
  );

  // Group visible sessions by date
  const sessionsByDate = useMemo(() => {
    const map: Record<string, SavedSession[]> = {};
    visibleSessions.forEach((s) => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [visibleSessions]);

  // Calendar grid
  const firstDay   = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  function cellDate(day: number): string {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function openDay(day: number) {
    const date = cellDate(day);
    const daySessions = sessionsByDate[date] ?? [];
    if (daySessions.length === 1) {
      const s = daySessions[0];
      const teamParam = s.team_id ? `&team_id=${s.team_id}` : "";
      router.push(`/planner?date=${date}${teamParam}`);
    } else if (daySessions.length > 1) {
      setDayPopover({ iso: date, sessions: daySessions });
    } else {
      router.push(`/planner?date=${date}`);
    }
  }

  function openSession(s: SavedSession) {
    const teamParam = s.team_id ? `&team_id=${s.team_id}` : "";
    router.push(`/planner?date=${s.date}${teamParam}`);
    setDayPopover(null);
  }

  // Sessions this month (sidebar)
  const monthSessions = visibleSessions
    .filter((s) => {
      const [y, m] = s.date.split("-").map(Number);
      return y === year && m === month + 1;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Practice Calendar</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">
            {loading ? "LOADING…" : `${visibleSessions.length} SAVED PLANS`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/planner")}
          className="flex items-center gap-2 bg-mustang-red hover:bg-mustang-red-dark text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <CalendarDays size={15} />
          New Plan
        </button>
      </div>

      {/* Team filter buttons */}
      <div className="flex gap-2 flex-wrap mb-5">
        <button
          type="button"
          onClick={() => setFilterTeamId(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            filterTeamId === null
              ? "bg-gray-200 border-gray-200 text-gray-900"
              : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
          }`}
        >
          All Teams
        </button>
        {teams.map((team) => {
          const color = colorFor(team.id);
          const isActive = filterTeamId === team.id;
          return (
            <button
              key={team.id}
              type="button"
              onClick={() => setFilterTeamId(team.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                isActive
                  ? `${color.bg} ${color.border} ${color.text}`
                  : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${color.dot}`} />
              {team.name}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* ── Calendar ─────────────────────────────────────────────── */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <button type="button" onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
              <ChevronLeft size={18} />
            </button>
            <h2 className="text-white font-semibold text-base">
              {MONTHS[month]} {year}
            </h2>
            <button type="button" onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 border-b border-gray-700">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2 text-center text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="aspect-square border-b border-r border-gray-700/40 last:border-r-0" />;
              const iso      = cellDate(day);
              const isToday  = iso === today;
              const daySessions = sessionsByDate[iso] ?? [];
              const hasPlan  = daySessions.length > 0;

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => openDay(day)}
                  className={`aspect-square border-b border-r border-gray-700/40 flex flex-col items-center justify-center gap-0.5 transition-colors relative group
                    ${isToday ? "bg-mustang-red/10" : "hover:bg-gray-700/40"}
                    ${idx % 7 === 6 ? "border-r-0" : ""}
                  `}
                >
                  <span className={`text-sm font-mono font-semibold
                    ${isToday ? "text-mustang-red" : hasPlan ? "text-white" : "text-gray-500"}`}>
                    {day}
                  </span>
                  {/* One dot per team that has a session on this day */}
                  {hasPlan && (
                    <div className="flex items-center gap-0.5">
                      {daySessions.map((s) => {
                        const color = colorFor(s.team_id);
                        return <div key={s.id} className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />;
                      })}
                    </div>
                  )}
                  {isToday && !hasPlan && (
                    <div className="w-1 h-1 rounded-full bg-mustang-red/60" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 px-6 py-3 border-t border-gray-700 flex-wrap">
            {teams.map((team) => {
              const color = colorFor(team.id);
              return (
                <div key={team.id} className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400">
                  <div className={`w-2 h-2 rounded-full ${color.dot}`} />
                  {team.name}
                </div>
              );
            })}
            <p className="text-[10px] font-mono text-gray-600 ml-auto">Click any day to open planner</p>
          </div>
        </div>

        {/* ── This month's plans list ───────────────────────────────── */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-700">
            <p className="text-white font-semibold text-sm">{MONTHS[month]} Plans</p>
            <p className="text-gray-500 text-xs font-mono">{monthSessions.length} session{monthSessions.length !== 1 ? "s" : ""}</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && (
              <p className="text-gray-600 text-xs font-mono text-center py-8">LOADING…</p>
            )}
            {!loading && monthSessions.length === 0 && (
              <p className="text-gray-600 text-xs font-mono text-center py-8">NO PLANS THIS MONTH</p>
            )}
            {monthSessions.map((s) => {
              const color = colorFor(s.team_id);
              const teamName = teams.find((t) => t.id === s.team_id)?.name;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => openSession(s)}
                  className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-700/50 last:border-0 hover:bg-gray-700/30 transition-colors text-left"
                >
                  <div className={`w-8 h-8 rounded-lg ${color.bg} border ${color.border} flex items-center justify-center shrink-0`}>
                    <Dumbbell size={14} className={color.text} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium">{formatDisplayDate(s.date)}</p>
                    <p className="text-gray-500 text-xs font-mono">
                      {s.drills.length} drill{s.drills.length !== 1 ? "s" : ""} · {s.start_time}
                      {teamName ? ` · ${teamName}` : ""}
                    </p>
                  </div>
                  {s.date === today && (
                    <span className="text-[9px] font-mono text-mustang-red bg-mustang-red/10 border border-mustang-red/20 px-1.5 py-0.5 rounded-full">
                      TODAY
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Day popover (multiple teams on same day) ──────────────── */}
      {dayPopover && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setDayPopover(null)}
        >
          <div
            className="bg-gray-800 border border-gray-700 rounded-2xl p-4 min-w-[240px] shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white font-semibold text-sm mb-3">{formatDisplayDate(dayPopover.iso)}</p>
            <p className="text-gray-500 text-xs font-mono mb-3">MULTIPLE PLANS — SELECT ONE:</p>
            <div className="flex flex-col gap-2">
              {dayPopover.sessions.map((s) => {
                const color = colorFor(s.team_id);
                const teamName = teams.find((t) => t.id === s.team_id)?.name ?? "Unknown Team";
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => openSession(s)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${color.border} ${color.bg} hover:opacity-90 transition-opacity text-left`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color.dot}`} />
                    <div>
                      <p className={`text-sm font-semibold ${color.text}`}>{teamName}</p>
                      <p className="text-gray-500 text-xs font-mono">
                        {s.drills.length} drill{s.drills.length !== 1 ? "s" : ""} · {s.start_time}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setDayPopover(null)}
              className="mt-3 w-full text-gray-500 text-xs font-mono hover:text-gray-300 transition-colors"
            >
              CANCEL
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
