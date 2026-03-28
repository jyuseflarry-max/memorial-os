"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, CalendarDays, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useTeam } from "@/context/TeamContext";
import { useLocations } from "@/context/LocationsContext";
import { useAuth } from "@/context/AuthContext";
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

function addMins(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total  = h * 60 + m + mins;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function subtractMins(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  let total = h * 60 + m - mins;
  if (total < 0) total += 24 * 60;
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  const suffix = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 || 12;
  return `${h12}:${String(mm).padStart(2, "0")} ${suffix}`;
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
  const { locations } = useLocations();
  const [today]  = useState(() => new Date());
  const [weekOf, setWeekOf] = useState(() => new Date());
  const { start, end } = getWeekBounds(weekOf);

  const [games,     setGames]     = useState<Game[]>([]);
  const [sessions,  setSessions]  = useState<SavedSession[]>([]);
  const [practices, setPractices] = useState<PracticeSchedule[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [filterTeam, setFilterTeam] = useState<string>("all");

  // Import auth to default players to their own team
  const { authUser, isPlayer } = useAuth();
  useEffect(() => {
    if (isPlayer && authUser?.teamId) setFilterTeam(authUser.teamId);
  }, [isPlayer, authUser?.teamId]);

  // Absence sheet state
  const [absenceSheet, setAbsenceSheet]       = useState<EventItem | null>(null);
  const [absenceReason, setAbsenceReason]     = useState("");
  const [submittingAbsence, setSubmittingAbsence] = useState(false);
  const [reportedDates, setReportedDates]     = useState<Set<string>>(new Set());

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

  async function handleAbsenceSubmit() {
    if (!absenceSheet || !authUser?.playerId) return;
    setSubmittingAbsence(true);
    const teamId =
      absenceSheet.kind === "game"    ? absenceSheet.game.team_id :
      absenceSheet.kind === "session" ? absenceSheet.session.team_id :
      absenceSheet.practice.team_id;
    try {
      await fetch("/api/attendance", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          practice_date: absenceSheet.date,
          player_id:     authUser.playerId,
          team_id:       teamId ?? null,
          status:        "excused",
          notes:         absenceReason.trim() || null,
        }),
      });
      setReportedDates((prev) => new Set([...prev, absenceSheet.date]));
      setAbsenceSheet(null);
      setAbsenceReason("");
    } finally {
      setSubmittingAbsence(false);
    }
  }

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

  // Load which event dates this player has already reported absent
  useEffect(() => {
    if (!isPlayer || !authUser?.playerId || loading || events.length === 0) return;
    const dates = [...new Set(events.map((e) => e.date))];
    const pid   = authUser.playerId;
    const tid   = authUser.teamId;
    Promise.all(
      dates.map((date) => {
        const p = new URLSearchParams({ date });
        if (tid) p.set("team_id", tid);
        return fetch(`/api/attendance?${p}`).then((r) => r.json()).catch(() => []);
      })
    ).then((results) => {
      const reported = new Set<string>();
      results.forEach((records: { player_id: string }[], i) => {
        if (Array.isArray(records) && records.some((r) => r.player_id === pid)) {
          reported.add(dates[i]);
        }
      });
      setReportedDates(reported);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, isPlayer, authUser?.playerId, authUser?.teamId, loading]);

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

                if (ev.kind === "game") {
                  const g = ev.game;
                  const timeStr  = g.time_tbd ? "Time TBD" : g.game_time ? fmt12h(g.game_time) : "Time TBD";
                  const locLabel = g.location_type === "home" ? "Home" : g.location_type === "away" ? "Away" : "Neutral";
                  const matchedLoc = g.venue ? locations.find((l) => [l.name, l.address, l.city].filter(Boolean).join(", ") === g.venue) : null;

                  // Away / Neutral: depart = game_time − 90 min − travel_time
                  const departureTime =
                    (g.location_type === "away" || g.location_type === "neutral") &&
                    g.game_time && !g.time_tbd && matchedLoc
                      ? subtractMins(g.game_time, matchedLoc.default_travel_time + 90)
                      : null;

                  // Home: arrive = game_time − 90 min
                  const arrivalTime =
                    g.location_type === "home" && g.game_time && !g.time_tbd
                      ? subtractMins(g.game_time, 90)
                      : null;

                  return (
                    <div
                      key={key}
                      onClick={() => isPlayer && setAbsenceSheet(ev)}
                      className={`flex items-start gap-3 px-4 py-3 ${i < items.length - 1 ? "border-b border-gray-800" : ""} ${isPlayer ? "cursor-pointer active:bg-gray-800/50" : ""}`}
                    >
                      <div className="w-2 h-2 rounded-full shrink-0 bg-coaches-red mt-1.5" />
                      <div className="flex-1 min-w-0">
                        {/* Line 1: opponent */}
                        <p className="text-white text-sm font-medium">Game — vs. {g.opponent}</p>
                        {/* Line 2: game type + location */}
                        <p className="text-gray-500 text-[11px] font-mono mt-0.5">
                          {GAME_TYPE_LABELS[g.game_type]} · {locLabel}
                        </p>
                        {/* Game note */}
                        {g.game_note && (
                          <p className="text-purple-400 text-[11px] font-mono mt-0.5">{g.game_note}</p>
                        )}
                        {/* Line 3: depart / arrive */}
                        {departureTime && (
                          <p className="flex items-center gap-1 text-amber-400 text-[11px] font-mono mt-0.5">
                            <Clock size={9} /> Depart by {departureTime}
                          </p>
                        )}
                        {arrivalTime && (
                          <p className="flex items-center gap-1 text-emerald-400 text-[11px] font-mono mt-0.5">
                            <Clock size={9} /> Be there by {arrivalTime}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end shrink-0 mt-0.5 gap-1">
                        <p className="text-gray-500 text-xs font-mono">{timeStr}</p>
                        {isPlayer && reportedDates.has(ev.date) && (
                          <span className="text-[9px] font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">Reported</span>
                        )}
                      </div>
                    </div>
                  );
                }

                let typeLabel = "";
                let timeStr   = "";
                let dotColor  = "";

                if (ev.kind === "session") {
                  const totalMin = ev.session.drills.reduce((s, d) => s + d.duration, 0);
                  typeLabel = "Practice" + (ev.session.label ? ` — ${ev.session.label}` : "");
                  timeStr   = totalMin > 0
                    ? `${fmt12h(ev.session.start_time)} – ${fmt12h(addMins(ev.session.start_time, totalMin))}`
                    : fmt12h(ev.session.start_time);
                  dotColor  = "bg-coaches-blue";
                } else {
                  typeLabel = "Practice";
                  timeStr   = `${fmt12h(ev.practice.start_time)} – ${fmt12h(ev.practice.end_time)}`;
                  dotColor  = "bg-sky-400";
                }

                return (
                  <div
                    key={key}
                    onClick={() => isPlayer && setAbsenceSheet(ev)}
                    className={`flex items-center gap-3 px-4 py-3 ${i < items.length - 1 ? "border-b border-gray-800" : ""} ${isPlayer ? "cursor-pointer active:bg-gray-800/50" : ""}`}
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                    <p className="flex-1 text-white text-sm">{typeLabel}</p>
                    <div className="flex flex-col items-end shrink-0 gap-1">
                      <p className="text-gray-500 text-xs font-mono">{timeStr}</p>
                      {isPlayer && reportedDates.has(ev.date) && (
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">Reported</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
      {/* Absence report sheet (players only) */}
      {absenceSheet && (() => {
        const label =
          absenceSheet.kind === "game"    ? `Game — vs. ${absenceSheet.game.opponent}` :
          absenceSheet.kind === "session" ? `Practice${absenceSheet.session.label ? ` — ${absenceSheet.session.label}` : ""}` :
          "Practice";
        const { weekday, short } = fmtDate(absenceSheet.date);
        return (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/60" onClick={() => { setAbsenceSheet(null); setAbsenceReason(""); }} />
            <div className="relative bg-gray-900 border-t border-gray-700 rounded-t-2xl p-5 flex flex-col gap-4">
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-gray-700 mx-auto -mt-1 mb-1" />
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-semibold">Can&apos;t make it?</p>
                  <p className="text-gray-400 text-sm mt-0.5 font-mono">{label} · {weekday}, {short}</p>
                </div>
                <button
                  onClick={() => { setAbsenceSheet(null); setAbsenceReason(""); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              {/* Reason */}
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-2 uppercase tracking-wider">Reason (optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. family trip, doctor appointment…"
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none focus:border-coaches-red transition-colors"
                />
              </div>
              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setAbsenceSheet(null); setAbsenceReason(""); }}
                  className="px-5 py-3 rounded-xl border border-gray-700 text-gray-400 text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={submittingAbsence}
                  onClick={handleAbsenceSubmit}
                  className="flex-1 py-3 rounded-xl bg-coaches-red text-white font-semibold text-sm disabled:opacity-50 transition-colors"
                >
                  {submittingAbsence ? "Submitting…" : reportedDates.has(absenceSheet.date) ? "Update Report" : "Report Absence"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </DashboardLayout>
  );
}
