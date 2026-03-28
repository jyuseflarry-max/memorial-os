"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, CalendarDays, Clock, MapPin } from "lucide-react";
import FamilyShell from "@/components/FamilyShell";
import { useAuth } from "@/context/AuthContext";
import type { Game } from "@/types/game";
import { GAME_TYPE_LABELS } from "@/types/game";
import type { PracticeSchedule } from "@/types/practice-schedule";

// ── Local types ─────────────────────────────────────────────────────────────

interface SavedSession {
  id: string;
  date: string;
  label: string;
  start_time: string;
  drills: Array<{ duration: number }>;
  team_id: string | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${suffix}`;
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

function addMins(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor(total / 60) % 24;
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

function isoToday() { return new Date().toISOString().split("T")[0]; }

// ── Event union ─────────────────────────────────────────────────────────────

type FamilyEvent =
  | { kind: "game";     date: string; teamId: string | null; game: Game }
  | { kind: "practice"; date: string; teamId: string | null; session: SavedSession }
  | { kind: "schedule"; date: string; teamId: string | null; practice: PracticeSchedule };

// ── Dashboard ───────────────────────────────────────────────────────────────

export default function FamilyDashboard() {
  const { authUser, isFamily, loading: authLoading } = useAuth();

  const linkedPlayers = authUser?.linkedPlayers ?? [];

  // Selected player pill ("all" or player id)
  const [selected, setSelected] = useState<string>("all");

  const [games,     setGames]     = useState<Game[]>([]);
  const [sessions,  setSessions]  = useState<SavedSession[]>([]);
  const [schedules, setSchedules] = useState<PracticeSchedule[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Team IDs we care about (deduped from linked players)
  const allTeamIds = useMemo(() => {
    const ids = new Set(linkedPlayers.map((p) => p.teamId).filter(Boolean) as string[]);
    return Array.from(ids);
  }, [linkedPlayers]);

  const activeTeamIds = useMemo(() => {
    if (selected === "all") return allTeamIds;
    const p = linkedPlayers.find((lp) => lp.playerId === selected);
    return p?.teamId ? [p.teamId] : [];
  }, [selected, allTeamIds, linkedPlayers]);

  // Fetch data for all relevant teams
  useEffect(() => {
    if (authLoading || !isFamily) return;
    if (allTeamIds.length === 0) { setDataLoading(false); return; }

    setDataLoading(true);
    Promise.all(
      allTeamIds.flatMap((teamId) => [
        fetch(`/api/games?team_id=${teamId}`).then((r) => r.json()),
        fetch(`/api/sessions?team_id=${teamId}`).then((r) => r.json()),
        fetch(`/api/practice-schedule?team_id=${teamId}`).then((r) => r.json()),
      ])
    )
      .then((results) => {
        const allGames:     Game[]             = [];
        const allSessions:  SavedSession[]     = [];
        const allSchedules: PracticeSchedule[] = [];

        for (let i = 0; i < results.length; i += 3) {
          if (Array.isArray(results[i]))     allGames.push(...(results[i] as Game[]));
          if (Array.isArray(results[i + 1])) allSessions.push(...(results[i + 1] as SavedSession[]));
          if (Array.isArray(results[i + 2])) allSchedules.push(...(results[i + 2] as PracticeSchedule[]));
        }

        setGames(allGames);
        setSessions(allSessions);
        setSchedules(allSchedules);
      })
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, [authLoading, isFamily, allTeamIds]);

  const today = isoToday();

  const upcomingEvents = useMemo<FamilyEvent[]>(() => {
    const filterTeam = (tid: string | null) =>
      activeTeamIds.length === 0 || (tid !== null && activeTeamIds.includes(tid));

    const gameEvents: FamilyEvent[] = games
      .filter((g) => g.game_date >= today && filterTeam(g.team_id ?? null))
      .map((g) => ({ kind: "game",     date: g.game_date,       teamId: g.team_id ?? null, game: g }));

    const sessionEvents: FamilyEvent[] = sessions
      .filter((s) => s.date >= today && filterTeam(s.team_id))
      .map((s) => ({ kind: "practice", date: s.date,            teamId: s.team_id,          session: s }));

    const sessionDates = new Set(sessionEvents.map((e) => e.date + (e.teamId ?? "")));
    const scheduleEvents: FamilyEvent[] = schedules
      .filter((p) =>
        p.practice_date >= today &&
        filterTeam(p.team_id ?? null) &&
        !sessionDates.has(p.practice_date + (p.team_id ?? ""))
      )
      .map((p) => ({ kind: "schedule", date: p.practice_date, teamId: p.team_id ?? null, practice: p }));

    return [...gameEvents, ...sessionEvents, ...scheduleEvents].sort((a, b) => {
      const dc = a.date.localeCompare(b.date);
      if (dc !== 0) return dc;
      const timeA = a.kind === "game" ? (a.game.game_time ?? "23:59") : a.kind === "practice" ? a.session.start_time : a.practice.start_time;
      const timeB = b.kind === "game" ? (b.game.game_time ?? "23:59") : b.kind === "practice" ? b.session.start_time : b.practice.start_time;
      return timeA.localeCompare(timeB);
    });
  }, [games, sessions, schedules, today, activeTeamIds]);

  // Group by date
  const byDate = useMemo(() => {
    const map = new Map<string, FamilyEvent[]>();
    for (const ev of upcomingEvents) {
      if (!map.has(ev.date)) map.set(ev.date, []);
      map.get(ev.date)!.push(ev);
    }
    return Array.from(map.entries());
  }, [upcomingEvents]);

  if (authLoading) return null;

  return (
    <FamilyShell>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-white text-2xl font-bold tracking-tight">Upcoming Schedule</h1>
        <p className="text-gray-400 text-sm mt-0.5 font-mono">Game days, practices, and departures</p>
      </div>

      {/* Player pill selector */}
      {linkedPlayers.length > 1 && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelected("all")}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors font-mono ${
              selected === "all"
                ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                : "border-gray-700 text-gray-400 hover:text-white"
            }`}
          >
            All
          </button>
          {linkedPlayers.map((lp) => (
            <button
              key={lp.playerId}
              type="button"
              onClick={() => setSelected(lp.playerId)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors font-mono ${
                selected === lp.playerId
                  ? "bg-purple-500/20 border-purple-500/40 text-purple-300"
                  : "border-gray-700 text-gray-400 hover:text-white"
              }`}
            >
              {lp.playerName.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {dataLoading && (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-purple-400" />
        </div>
      )}

      {/* Empty state */}
      {!dataLoading && upcomingEvents.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <CalendarDays size={40} className="text-gray-700" />
          <p className="text-gray-500 font-mono text-sm">No upcoming events.</p>
        </div>
      )}

      {/* No linked players */}
      {!dataLoading && linkedPlayers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-gray-500 text-sm">No players linked to your account.</p>
          <p className="text-gray-600 text-xs font-mono">Use the link from your coach to add a player.</p>
        </div>
      )}

      {/* Event list */}
      {!dataLoading && byDate.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
          {byDate.map(([date, items], di) => {
            const { weekday, short } = fmtDate(date);
            const isToday = date === today;
            return (
              <div key={date} className={di > 0 ? "border-t border-gray-700" : ""}>
                {/* Day header */}
                <div className={`flex items-center gap-3 px-4 py-2 ${isToday ? "bg-purple-500/10" : "bg-gray-800/40"}`}>
                  <p className={`text-xs font-mono font-semibold uppercase tracking-wider ${isToday ? "text-purple-400" : "text-gray-400"}`}>
                    {weekday}
                  </p>
                  <p className={`text-xs font-mono ${isToday ? "text-purple-400/80" : "text-gray-500"}`}>{short}</p>
                  {isToday && <span className="text-[9px] font-mono bg-purple-500 text-white px-1.5 py-0.5 rounded-full">TODAY</span>}
                </div>

                {/* Events */}
                {items.map((ev, i) => {
                  const border = i < items.length - 1 ? "border-b border-gray-800" : "";

                  if (ev.kind === "game") {
                    const g = ev.game;
                    const locLabel = g.location_type === "home" ? "Home" : g.location_type === "away" ? "Away" : "Neutral";
                    const timeStr  = g.time_tbd ? "Time TBD" : g.game_time ? fmt12h(g.game_time) : "Time TBD";
                    const venueUrl = g.venue ? `https://maps.google.com/maps?q=${encodeURIComponent(g.venue)}` : null;
                    // Departure time (no location record available here — use a generic 35-min buffer for display)
                    // If the venue field is set, families just know to leave 35 min before tipoff as a default
                    // For full departure time, the weekly view (with locations context) is more precise.
                    return (
                      <div key={g.id} className={`px-4 py-3 ${border}`}>
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-coaches-red shrink-0 mt-1.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-medium">
                              Game — vs. {g.opponent}
                            </p>
                            <p className="text-gray-500 text-[11px] font-mono mt-0.5">
                              {GAME_TYPE_LABELS[g.game_type]} · {locLabel}
                            </p>
                            {g.game_note && (
                              <p className="text-purple-400 text-[11px] font-mono mt-0.5">{g.game_note}</p>
                            )}
                            {venueUrl && g.venue && (
                              <a
                                href={venueUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-[11px] font-mono text-coaches-blue hover:text-blue-300 transition-colors mt-0.5 truncate"
                              >
                                <MapPin size={9} /> {g.venue}
                              </a>
                            )}
                          </div>
                          <p className="text-gray-500 text-xs font-mono shrink-0 mt-0.5">{timeStr}</p>
                        </div>
                      </div>
                    );
                  }

                  if (ev.kind === "practice") {
                    const s = ev.session;
                    const totalMin = s.drills.reduce((acc, d) => acc + d.duration, 0);
                    const timeStr  = totalMin > 0
                      ? `${fmt12h(s.start_time)} – ${addMins(s.start_time, totalMin)}`
                      : fmt12h(s.start_time);
                    return (
                      <div key={s.id} className={`flex items-center gap-3 px-4 py-3 ${border}`}>
                        <div className="w-2 h-2 rounded-full bg-coaches-blue shrink-0" />
                        <div className="flex-1">
                          <p className="text-white text-sm">Practice{s.label ? ` — ${s.label}` : ""}</p>
                        </div>
                        <p className="text-gray-500 text-xs font-mono shrink-0">{timeStr}</p>
                      </div>
                    );
                  }

                  // schedule
                  const p = ev.practice;
                  return (
                    <div key={p.id} className={`flex items-center gap-3 px-4 py-3 ${border}`}>
                      <div className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                      <div className="flex-1">
                        <p className="text-white text-sm">Practice</p>
                        {p.notes && <p className="text-gray-500 text-[11px] font-mono mt-0.5">{p.notes}</p>}
                      </div>
                      <p className="text-gray-500 text-xs font-mono shrink-0">
                        <Clock size={9} className="inline mr-1" />
                        {fmt12h(p.start_time)} – {fmt12h(p.end_time)}
                      </p>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </FamilyShell>
  );
}
