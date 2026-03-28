"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useTeam } from "@/context/TeamContext";
import type { Game } from "@/types/game";
import { GAME_TYPE_LABELS } from "@/types/game";
import type { PracticeSchedule } from "@/types/practice-schedule";

interface SavedSession {
  id: string;
  date: string;
  label: string;
  start_time: string;
  drills: Array<{ duration: number }>;
  team_id: string | null;
}

function getWeekBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function toISO(d: Date): string { return d.toISOString().split("T")[0]; }

function fmt12h(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  return `${h % 12 === 0 ? 12 : h % 12}:${mStr} ${h >= 12 ? "PM" : "AM"}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "long" }),
    short:   d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  };
}

type EventItem =
  | { kind: "game";     date: string; time: string | null; game: Game }
  | { kind: "session";  date: string; time: string;        session: SavedSession }
  | { kind: "schedule"; date: string; time: string;        practice: PracticeSchedule };

export default function WeeklyEventsPage() {
  const { teams, activeTeam } = useTeam();
  const [today]  = useState(() => new Date());
  const [weekOf, setWeekOf] = useState(() => new Date());
  const { start, end } = getWeekBounds(weekOf);

  const [games,     setGames]     = useState<Game[]>([]);
  const [sessions,  setSessions]  = useState<SavedSession[]>([]);
  const [practices, setPractices] = useState<PracticeSchedule[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filterTeam, setFilterTeam] = useState<string>("all");

  const weekLabel = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  useEffect(() => {
    setLoading(true);
    const pp = new URLSearchParams();
    if (activeTeam) pp.set("team_id", activeTeam.id);
    Promise.all([
      fetch("/api/games").then((r) => r.json()),
      fetch("/api/sessions").then((r) => r.json()),
      fetch(`/api/practice-schedule?${pp}`).then((r) => r.json()),
    ]).then(([g, s, p]) => {
      setGames(Array.isArray(g) ? g : []);
      setSessions(Array.isArray(s) ? s : []);
      setPractices(Array.isArray(p) ? p : []);
    }).catch(() => {}).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOf, activeTeam]);

  const events = useMemo<EventItem[]>(() => {
    const fromStr = toISO(start);
    const toStr   = toISO(end);

    const gameEvents: EventItem[] = games
      .filter((g) => g.game_date >= fromStr && g.game_date <= toStr && (filterTeam === "all" || g.team_id === filterTeam))
      .map((g) => ({ kind: "game", date: g.game_date, time: g.game_time, game: g }));

    const sessionEvents: EventItem[] = sessions
      .filter((s) => s.date >= fromStr && s.date <= toStr && (filterTeam === "all" || s.team_id === filterTeam))
      .map((s) => ({ kind: "session", date: s.date, time: s.start_time, session: s }));

    const sessionDates = new Set(sessionEvents.map((e) => e.date));
    const scheduleEvents: EventItem[] = practices
      .filter((p) => p.practice_date >= fromStr && p.practice_date <= toStr && !sessionDates.has(p.practice_date) && (filterTeam === "all" || p.team_id === filterTeam))
      .map((p) => ({ kind: "schedule", date: p.practice_date, time: p.start_time, practice: p }));

    return [...gameEvents, ...sessionEvents, ...scheduleEvents].sort((a, b) => {
      const dc = a.date.localeCompare(b.date);
      if (dc !== 0) return dc;
      return (a.time ?? "23:59").localeCompare(b.time ?? "23:59");
    });
  }, [games, sessions, practices, filterTeam, start, end]);

  const byDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const e of events) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return Array.from(map.entries());
  }, [events]);

  const prevWeek = () => { const d = new Date(weekOf); d.setDate(d.getDate() - 7); setWeekOf(d); };
  const nextWeek = () => { const d = new Date(weekOf); d.setDate(d.getDate() + 7); setWeekOf(d); };
  const goToday  = () => setWeekOf(new Date());

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Weekly Events</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
          <button onClick={goToday} className="px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white text-xs font-mono transition-colors">Today</button>
          <button onClick={nextWeek} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors"><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Team filter pills */}
      {teams.length > 1 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <button onClick={() => setFilterTeam("all")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors font-mono ${filterTeam === "all" ? "bg-coaches-red border-coaches-red text-white" : "border-gray-700 text-gray-400 hover:text-white"}`}>All Teams</button>
          {teams.map((t) => (
            <button key={t.id} onClick={() => setFilterTeam(t.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors font-mono ${filterTeam === t.id ? "bg-coaches-red border-coaches-red text-white" : "border-gray-700 text-gray-400 hover:text-white"}`}>{t.name}</button>
          ))}
        </div>
      )}

      {loading && <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-coaches-red" /></div>}

      {!loading && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <CalendarDays size={40} className="text-gray-700" />
          <p className="text-gray-500 font-mono text-sm">No events this week.</p>
        </div>
      )}

      {/* Event list */}
      <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
        {byDate.map(([date, items], di) => {
          const { weekday, short } = fmtDate(date);
          const isToday = date === toISO(today);
          return (
            <div key={date} className={di > 0 ? "border-t border-gray-700" : ""}>
              {/* Day header */}
              <div className={`flex items-center gap-3 px-4 py-2 ${isToday ? "bg-coaches-red/10" : "bg-gray-800/40"}`}>
                <p className={`text-xs font-mono font-semibold uppercase tracking-wider ${isToday ? "text-coaches-red" : "text-gray-400"}`}>
                  {weekday}
                </p>
                <p className={`text-xs font-mono ${isToday ? "text-coaches-red/80" : "text-gray-500"}`}>{short}</p>
                {isToday && <span className="text-[9px] font-mono bg-coaches-red text-white px-1.5 py-0.5 rounded-full">TODAY</span>}
              </div>

              {/* Events for this day */}
              {items.map((ev, i) => {
                const key = ev.kind === "game" ? ev.game.id : ev.kind === "session" ? ev.session.id : ev.practice.id;

                let typeLabel = "";
                let timeStr   = "";
                let dotColor  = "";

                if (ev.kind === "game") {
                  typeLabel = `Game — vs. ${ev.game.opponent} (${GAME_TYPE_LABELS[ev.game.game_type]}, ${ev.game.location_type === "home" ? "Home" : ev.game.location_type === "away" ? "Away" : "Neutral"})`;
                  timeStr   = ev.game.time_tbd ? "Time TBD" : ev.game.game_time ? fmt12h(ev.game.game_time) : "Time TBD";
                  dotColor  = "bg-coaches-red";
                } else if (ev.kind === "session") {
                  const totalMin = ev.session.drills.reduce((s, d) => s + d.duration, 0);
                  typeLabel = "Practice" + (ev.session.label ? ` — ${ev.session.label}` : "");
                  timeStr   = fmt12h(ev.session.start_time) + (totalMin > 0 ? ` · ${totalMin}m` : "");
                  dotColor  = "bg-coaches-blue";
                } else {
                  typeLabel = "Practice";
                  timeStr   = `${fmt12h(ev.practice.start_time)} – ${fmt12h(ev.practice.end_time)}`;
                  dotColor  = "bg-sky-400";
                }

                return (
                  <div key={key} className={`flex items-center gap-3 px-4 py-3 ${i < items.length - 1 ? "border-b border-gray-800" : ""}`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                    <p className="flex-1 text-white text-sm">{typeLabel}</p>
                    <p className="text-gray-500 text-xs font-mono shrink-0">{timeStr}</p>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
