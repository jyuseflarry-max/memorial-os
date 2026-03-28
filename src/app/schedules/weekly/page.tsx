"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, CalendarDays, Gamepad2, Dumbbell, MapPin, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useTeam } from "@/context/TeamContext";
import type { Game } from "@/types/game";
import { LOCATION_LABELS, GAME_TYPE_LABELS } from "@/types/game";
import type { PracticeSchedule } from "@/types/practice-schedule";

function getWeekBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay()); // Sunday
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Saturday
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

const LOCATION_STYLES = {
  home:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  away:    "bg-sky-500/15 text-sky-400 border-sky-500/30",
  neutral: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

type EventItem =
  | { kind: "game";     date: string; time: string | null; game: Game }
  | { kind: "practice"; date: string; time: string;        practice: PracticeSchedule };

export default function WeeklyEventsPage() {
  const { teams, activeTeam } = useTeam();
  const [today]  = useState(() => new Date());
  const [weekOf, setWeekOf] = useState(() => new Date());
  const { start, end } = getWeekBounds(weekOf);

  const [games,     setGames]     = useState<Game[]>([]);
  const [practices, setPractices] = useState<PracticeSchedule[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filterTeam, setFilterTeam] = useState<string>("all");

  // Build week label e.g. "Mar 23 – Mar 29, 2026"
  const weekLabel = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  useEffect(() => {
    setLoading(true);
    const pp = new URLSearchParams();
    if (activeTeam) { pp.set("team_id", activeTeam.id); }

    Promise.all([
      fetch(`/api/games`).then((r) => r.json()),
      fetch(`/api/practice-schedule?${pp}`).then((r) => r.json()),
    ]).then(([g, p]) => {
      setGames(Array.isArray(g) ? g : []);
      setPractices(Array.isArray(p) ? p : []);
    }).catch(() => {}).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOf, activeTeam]);

  const events = useMemo<EventItem[]>(() => {
    const fromStr = toISO(start);
    const toStr   = toISO(end);
    const all: EventItem[] = [
      ...games
        .filter((g) => g.game_date >= fromStr && g.game_date <= toStr)
        .map((g): EventItem => ({ kind: "game", date: g.game_date, time: g.game_time, game: g })),
      ...practices
        .filter((p) => p.practice_date >= fromStr && p.practice_date <= toStr)
        .map((p): EventItem => ({ kind: "practice", date: p.practice_date, time: p.start_time, practice: p })),
    ];
    return all.sort((a, b) => {
      const dc = a.date.localeCompare(b.date);
      if (dc !== 0) return dc;
      return (a.time ?? "23:59").localeCompare(b.time ?? "23:59");
    });
  }, [games, practices, start, end]);

  // Group by date
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

  // Suppress unused variable warning — filterTeam used by pill buttons above
  void filterTeam;

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

      <div className="flex flex-col gap-5">
        {byDate.map(([date, items]) => {
          const { weekday, short } = fmtDate(date);
          const isToday = date === toISO(today);
          return (
            <div key={date}>
              <div className={`flex items-center gap-2 mb-2 px-1 ${isToday ? "text-coaches-red" : "text-gray-500"}`}>
                <p className="text-[10px] font-mono uppercase tracking-widest">{weekday}</p>
                <p className="text-[10px] font-mono">{short}</p>
                {isToday && <span className="text-[9px] font-mono bg-coaches-red text-white px-1.5 py-0.5 rounded-full">TODAY</span>}
              </div>
              <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
                {items.map((ev, i) => (
                  <div key={ev.kind === "game" ? ev.game.id : ev.practice.id} className={`flex items-center gap-3 px-4 py-3.5 ${i < items.length - 1 ? "border-b border-gray-700/50" : ""}`}>
                    {ev.kind === "game" ? (
                      <>
                        <div className="w-7 h-7 rounded-lg bg-coaches-red/10 border border-coaches-red/20 flex items-center justify-center shrink-0">
                          <Gamepad2 size={13} className="text-coaches-red" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-white text-sm font-semibold truncate">vs. {ev.game.opponent}</p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border uppercase tracking-wide ${LOCATION_STYLES[ev.game.location_type]}`}>
                              {LOCATION_LABELS[ev.game.location_type]}
                            </span>
                            <span className="text-[10px] font-mono text-gray-500 border border-gray-700 px-1.5 py-0.5 rounded-full">{GAME_TYPE_LABELS[ev.game.game_type]}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            {ev.game.game_time && !ev.game.time_tbd && (
                              <span className="flex items-center gap-1 text-[11px] font-mono text-gray-500"><Clock size={9} />{fmt12h(ev.game.game_time)}</span>
                            )}
                            {ev.game.time_tbd && <span className="text-[11px] font-mono text-gray-600">Time TBD</span>}
                            {ev.game.venue && (
                              <a href={`https://maps.google.com/maps?q=${encodeURIComponent(ev.game.venue)}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-mono text-coaches-blue hover:text-blue-300 transition-colors truncate">
                                <MapPin size={9} />{ev.game.venue}
                              </a>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-7 h-7 rounded-lg bg-sky-900/40 border border-sky-800/40 flex items-center justify-center shrink-0">
                          <Dumbbell size={13} className="text-sky-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold">Practice</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1 text-[11px] font-mono text-gray-500">
                              <Clock size={9} />{fmt12h(ev.practice.start_time)}–{fmt12h(ev.practice.end_time)}
                            </span>
                            {ev.practice.location && (
                              <span className="flex items-center gap-1 text-[11px] font-mono text-gray-500 truncate">
                                <MapPin size={9} />{ev.practice.location.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
