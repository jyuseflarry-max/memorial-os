"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays, Dumbbell } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useTeam } from "@/context/TeamContext";

interface SavedSession {
  id: string;
  date: string;        // YYYY-MM-DD
  start_time: string;
  drills: unknown[];
}

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
  const { activeTeam } = useTeam();
  const [year,  setYear]    = useState(() => new Date().getFullYear());
  const [month, setMonth]   = useState(() => new Date().getMonth()); // 0-indexed
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    const teamParam = activeTeam ? `?team_id=${activeTeam.id}` : "";
    fetch(`/api/sessions${teamParam}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setSessions(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeTeam]);

  // Build a set of dates that have saved sessions
  const sessionDates = new Set(sessions.map((s) => s.date));
  const sessionMap   = Object.fromEntries(sessions.map((s) => [s.date, s]));

  // Calendar grid
  const firstDay  = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last week
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
    router.push(`/planner?date=${cellDate(day)}`);
  }

  // Sessions this month (for the sidebar list)
  const monthSessions = sessions
    .filter((s) => {
      const [y, m] = s.date.split("-").map(Number);
      return y === year && m === month + 1;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Practice Calendar</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">
            {loading ? "LOADING…" : `${sessions.length} SAVED PLANS`}
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
              const iso     = cellDate(day);
              const isToday = iso === today;
              const hasPlan = sessionDates.has(iso);
              const drillCount = hasPlan ? (sessionMap[iso]?.drills?.length ?? 0) : 0;

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
                  {hasPlan && (
                    <div className="flex items-center gap-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-mustang-red" />
                      <span className="text-[9px] font-mono text-gray-500">{drillCount}</span>
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
          <div className="flex items-center gap-4 px-6 py-3 border-t border-gray-700">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
              <div className="w-2 h-2 rounded-full bg-mustang-red" /> Saved plan
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
              <div className="w-2 h-2 rounded-full bg-mustang-red/30" /> Today
            </div>
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
            {monthSessions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => router.push(`/planner?date=${s.date}`)}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-700/50 last:border-0 hover:bg-gray-700/30 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-lg bg-mustang-red/10 border border-mustang-red/20 flex items-center justify-center shrink-0">
                  <Dumbbell size={14} className="text-mustang-red" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{formatDisplayDate(s.date)}</p>
                  <p className="text-gray-500 text-xs font-mono">
                    {s.drills.length} drill{s.drills.length !== 1 ? "s" : ""} · {s.start_time}
                  </p>
                </div>
                {s.date === today && (
                  <span className="text-[9px] font-mono text-mustang-red bg-mustang-red/10 border border-mustang-red/20 px-1.5 py-0.5 rounded-full">
                    TODAY
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
