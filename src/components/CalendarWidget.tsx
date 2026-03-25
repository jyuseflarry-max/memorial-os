"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Dumbbell, Swords } from "lucide-react";
import { useTeam } from "@/context/TeamContext";
import { Game, GAME_TYPE_LABELS } from "@/types/game";

interface SavedSession {
  id: string;
  date: string;
  label: string;
  start_time: string;
  drills: Array<{ duration: number }>;
  team_id: string | null;
}

const TEAM_COLORS = [
  { dot: "bg-coaches-red",   text: "text-coaches-red",   border: "border-coaches-red/30",   bg: "bg-coaches-red/10"   },
  { dot: "bg-sky-400",       text: "text-sky-400",       border: "border-sky-400/30",       bg: "bg-sky-400/10"       },
  { dot: "bg-emerald-400",   text: "text-emerald-400",   border: "border-emerald-400/30",   bg: "bg-emerald-400/10"   },
  { dot: "bg-amber-400",     text: "text-amber-400",     border: "border-amber-400/30",     bg: "bg-amber-400/10"     },
  { dot: "bg-purple-400",    text: "text-purple-400",    border: "border-purple-400/30",    bg: "bg-purple-400/10"    },
  { dot: "bg-pink-400",      text: "text-pink-400",      border: "border-pink-400/30",      bg: "bg-pink-400/10"      },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS   = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function isoToday() { return new Date().toISOString().split("T")[0]; }

function formatDisplayDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function formatTime12(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatTimeShort(time: string) {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "p" : "a";
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${ampm}` : `${hour}:${String(m).padStart(2, "0")}${ampm}`;
}

function addMinutes(time: string, mins: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return formatTimeShort(`${hh}:${String(mm).padStart(2, "0")}`);
}

function locationLabel(g: Game) {
  if (g.location_type === "home") return "H";
  if (g.location_type === "away") return "A";
  return "N";
}

function gameColorCls(g: Game) {
  if (g.game_type === "scrimmage") return { text: "text-gray-400", bg: "bg-gray-400/10", border: "border-gray-400/30" };
  if (g.location_type === "home")  return { text: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30" };
  return { text: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30" };
}

type DayEvent =
  | { kind: "session"; data: SavedSession }
  | { kind: "game";    data: Game };

export default function CalendarWidget() {
  const router = useRouter();
  const today  = isoToday();
  const { teams } = useTeam();

  const [year,  setYear]  = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [games,    setGames]    = useState<Game[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [dayPopover, setDayPopover] = useState<{ iso: string; events: DayEvent[] } | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [tooltip, setTooltip] = useState<{ ev: DayEvent; x: number; y: number } | null>(null);

  const showTooltip = useCallback((ev: DayEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltip({ ev, x: rect.left, y: rect.bottom + 6 });
  }, []);

  const hideTooltip = useCallback(() => setTooltip(null), []);

  const teamColorMap = useMemo(() => {
    const map: Record<string, number> = {};
    teams.forEach((t, i) => { map[t.id] = i % TEAM_COLORS.length; });
    return map;
  }, [teams]);

  function colorFor(teamId: string | null) {
    if (!teamId) return TEAM_COLORS[0];
    return TEAM_COLORS[teamColorMap[teamId] ?? 0];
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/sessions").then((r) => r.json()),
      fetch("/api/games").then((r) => r.json()),
    ])
      .then(([sessionData, gameData]) => {
        if (Array.isArray(sessionData)) setSessions(sessionData);
        if (Array.isArray(gameData))    setGames(gameData);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredSessions = useMemo(() =>
    teamFilter === "all" ? sessions : sessions.filter((s) => s.team_id === teamFilter),
  [sessions, teamFilter]);

  const filteredGames = useMemo(() =>
    teamFilter === "all" ? games : games.filter((g) => g.team_id === teamFilter),
  [games, teamFilter]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, DayEvent[]> = {};
    filteredSessions.forEach((s) => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push({ kind: "session", data: s });
    });
    filteredGames.forEach((g) => {
      if (!map[g.game_date]) map[g.game_date] = [];
      map[g.game_date].push({ kind: "game", data: g });
    });
    return map;
  }, [filteredSessions, filteredGames]);

  const firstDay    = new Date(year, month, 1).getDay();
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

  function cellDate(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function sessionUrl(s: SavedSession) {
    const qp = new URLSearchParams();
    if (s.team_id) qp.set("team_id", s.team_id);
    if (s.label)   qp.set("label", s.label);
    const qs = qp.toString();
    return `/view-plans/${s.date}${qs ? `?${qs}` : ""}`;
  }

  function openDay(day: number) {
    const date   = cellDate(day);
    const events = eventsByDate[date] ?? [];
    if (events.length === 0) {
      router.push("/build-a-plan");
    } else if (events.length === 1) {
      const ev = events[0];
      if (ev.kind === "session") router.push(sessionUrl(ev.data));
      else router.push("/schedules/game");
    } else {
      setDayPopover({ iso: date, events });
    }
  }

  function openEvent(ev: DayEvent) {
    if (ev.kind === "session") router.push(sessionUrl(ev.data));
    else router.push("/schedules/game");
    setDayPopover(null);
  }

  // Month event list (sessions + games combined, sorted by date then time)
  const monthEvents: DayEvent[] = useMemo(() => {
    const sessionEvents: DayEvent[] = filteredSessions
      .filter((s) => {
        const [y, m] = s.date.split("-").map(Number);
        return y === year && m === month + 1;
      })
      .map((s) => ({ kind: "session", data: s }));

    const gameEvents: DayEvent[] = filteredGames
      .filter((g) => {
        const [y, m] = g.game_date.split("-").map(Number);
        return y === year && m === month + 1;
      })
      .map((g) => ({ kind: "game", data: g }));

    return [...sessionEvents, ...gameEvents].sort((a, b) => {
      const dateA = a.kind === "session" ? a.data.date : a.data.game_date;
      const dateB = b.kind === "session" ? b.data.date : b.data.game_date;
      return dateA.localeCompare(dateB);
    });
  }, [filteredSessions, filteredGames, year, month]);

  return (
    <>
      {/* Team filter pills */}
      {teams.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setTeamFilter("all")}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
            style={teamFilter === "all" ? {
              color: "#fff",
              backgroundColor: "rgb(237 28 36 / 0.15)",
              borderColor: "rgb(237 28 36 / 0.4)",
            } : {
              color: "rgb(156 163 175)",
              backgroundColor: "transparent",
              borderColor: "rgb(55 65 81)",
            }}
          >
            All Teams
          </button>
          {teams.map((team) => {
            const color  = colorFor(team.id);
            const active = teamFilter === team.id;
            return (
              <button
                key={team.id}
                type="button"
                onClick={() => setTeamFilter(team.id)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                style={active ? { color: "white", borderColor: "transparent" } : {
                  color: "rgb(156 163 175)",
                  backgroundColor: "transparent",
                  borderColor: "rgb(55 65 81)",
                }}
              >
                {active && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.dot}`} />}
                {!active && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.dot} opacity-60`} />}
                <span className={active ? color.text : ""}>{team.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <button type="button" onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-white font-semibold text-sm">{MONTHS[month]} {year}</h2>
          <button type="button" onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Weekday labels */}
        <div className="grid grid-cols-7 border-b border-gray-700">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1.5 text-center text-[9px] font-mono text-gray-500 uppercase tracking-wider">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} className="aspect-square border-b border-r border-gray-700/40 last:border-r-0" />;
            const iso       = cellDate(day);
            const isToday   = iso === today;
            const events    = eventsByDate[iso] ?? [];
            const hasEvents = events.length > 0;

            const sortedEvents = [...events].sort((a, b) => {
              const timeA = a.kind === "session" ? a.data.start_time : (a.data.game_time ?? "00:00");
              const timeB = b.kind === "session" ? b.data.start_time : (b.data.game_time ?? "00:00");
              return timeA.localeCompare(timeB);
            });

            return (
              <button
                key={iso}
                type="button"
                onClick={() => openDay(day)}
                className={`aspect-square border-b border-r border-gray-700/40 flex flex-col items-start justify-start p-1 gap-0.5 transition-colors
                  ${isToday ? "bg-coaches-red/10" : "hover:bg-gray-700/40"}
                  ${idx % 7 === 6 ? "border-r-0" : ""}
                `}
              >
                <span className={`text-xs font-mono font-semibold leading-none
                  ${isToday ? "text-coaches-red" : hasEvents ? "text-white" : "text-gray-500"}`}>
                  {day}
                </span>
                {sortedEvents.map((ev, i) => {
                  if (ev.kind === "session") {
                    const s        = ev.data;
                    const color    = colorFor(s.team_id);
                    const totalMin = s.drills.reduce((sum, d) => sum + d.duration, 0);
                    const end      = totalMin > 0 ? addMinutes(s.start_time, totalMin) : null;
                    return (
                      <span key={`s-${s.id}`}
                        onMouseEnter={(e) => showTooltip(ev, e)}
                        onMouseLeave={hideTooltip}
                        className={`text-[8px] font-mono font-semibold leading-none px-1 py-px rounded-full ${color.text} ${color.bg} border ${color.border} truncate max-w-full`}>
                        {formatTimeShort(s.start_time)}{end ? `–${end}` : ""}
                      </span>
                    );
                  } else {
                    const g     = ev.data;
                    const gcls  = gameColorCls(g);
                    const label = g.time_tbd ? "TBD" : g.game_time ? formatTimeShort(g.game_time) : "";
                    return (
                      <span key={`g-${g.id}-${i}`}
                        onMouseEnter={(e) => showTooltip(ev, e)}
                        onMouseLeave={hideTooltip}
                        className={`text-[8px] font-mono font-semibold leading-none px-1 py-px rounded-full ${gcls.text} ${gcls.bg} border ${gcls.border} truncate max-w-full`}>
                        {label ? `${label} ` : ""}{g.opponent} {locationLabel(g)}
                      </span>
                    );
                  }
                })}
                {isToday && !hasEvents && <div className="w-1 h-1 rounded-full bg-coaches-red/60 mt-0.5" />}
              </button>
            );
          })}
        </div>

        {/* Month event list */}
        {!loading && monthEvents.length > 0 && (
          <div className="border-t border-gray-700">
            <p className="text-[9px] font-mono text-gray-500 uppercase tracking-wider px-4 pt-2.5 pb-1">{MONTHS[month]} Schedule</p>
            {monthEvents.map((ev, i) => {
              if (ev.kind === "session") {
                const s      = ev.data;
                const color  = colorFor(s.team_id);
                const teamName = teams.find((t) => t.id === s.team_id)?.name;
                return (
                  <button key={`sl-${s.id}`} type="button" onClick={() => openEvent(ev)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-gray-700/50 last:border-0 hover:bg-gray-700/30 transition-colors text-left">
                    <div className={`w-7 h-7 rounded-lg ${color.bg} border ${color.border} flex items-center justify-center shrink-0`}>
                      <Dumbbell size={12} className={color.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium">
                        {formatDisplayDate(s.date)}
                        {s.label && <span className="ml-1.5 text-[9px] font-mono text-gray-400 bg-gray-700 border border-gray-600 px-1.5 py-0.5 rounded-full">{s.label}</span>}
                      </p>
                      <p className="text-gray-500 text-[10px] font-mono">
                        {teamName ? `${teamName} · ` : ""}Practice · {formatTime12(s.start_time)}
                      </p>
                    </div>
                    {s.date === today && (
                      <span className="text-[9px] font-mono text-coaches-red bg-coaches-red/10 border border-coaches-red/20 px-1.5 py-0.5 rounded-full">TODAY</span>
                    )}
                  </button>
                );
              } else {
                const g    = ev.data;
                const gcls = gameColorCls(g);
                const teamName = teams.find((t) => t.id === g.team_id)?.name;
                const timeStr  = g.time_tbd ? "TBD" : g.game_time ? formatTime12(g.game_time) : "Time TBD";
                return (
                  <button key={`gl-${g.id}-${i}`} type="button" onClick={() => openEvent(ev)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-gray-700/50 last:border-0 hover:bg-gray-700/30 transition-colors text-left">
                    <div className={`w-7 h-7 rounded-lg ${gcls.bg} border ${gcls.border} flex items-center justify-center shrink-0`}>
                      <Swords size={12} className={gcls.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium">
                        {formatDisplayDate(g.game_date)}
                        <span className={`ml-1.5 text-[9px] font-mono px-1.5 py-0.5 rounded-full ${gcls.text} ${gcls.bg} border ${gcls.border}`}>
                          {GAME_TYPE_LABELS[g.game_type]}
                        </span>
                      </p>
                      <p className="text-gray-500 text-[10px] font-mono">
                        {teamName ? `${teamName} · ` : ""}vs {g.opponent} · {locationLabel(g)} · {timeStr}
                      </p>
                    </div>
                    {g.game_date === today && (
                      <span className="text-[9px] font-mono text-coaches-red bg-coaches-red/10 border border-coaches-red/20 px-1.5 py-0.5 rounded-full">TODAY</span>
                    )}
                  </button>
                );
              }
            })}
          </div>
        )}
      </div>

      {/* Day popover */}
      {dayPopover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDayPopover(null)}>
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 min-w-[260px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-white font-semibold text-sm mb-3">{formatDisplayDate(dayPopover.iso)}</p>
            <div className="flex flex-col gap-2">
              {dayPopover.events.map((ev, i) => {
                if (ev.kind === "session") {
                  const s        = ev.data;
                  const color    = colorFor(s.team_id);
                  const teamName = teams.find((t) => t.id === s.team_id)?.name ?? "Practice";
                  return (
                    <button key={`sp-${s.id}`} type="button" onClick={() => openEvent(ev)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${color.border} ${color.bg} hover:opacity-90 transition-opacity text-left`}>
                      <Dumbbell size={14} className={color.text} />
                      <div>
                        <p className={`text-sm font-semibold ${color.text}`}>{teamName}{s.label ? ` · ${s.label}` : ""}</p>
                        <p className="text-gray-500 text-xs font-mono">Practice · {formatTime12(s.start_time)}</p>
                      </div>
                    </button>
                  );
                } else {
                  const g        = ev.data;
                  const gcls     = gameColorCls(g);
                  const timeStr  = g.time_tbd ? "TBD" : g.game_time ? formatTime12(g.game_time) : "Time TBD";
                  return (
                    <button key={`gp-${g.id}-${i}`} type="button" onClick={() => openEvent(ev)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${gcls.border} ${gcls.bg} hover:opacity-90 transition-opacity text-left`}>
                      <Swords size={14} className={gcls.text} />
                      <div>
                        <p className={`text-sm font-semibold ${gcls.text}`}>vs {g.opponent}</p>
                        <p className="text-gray-500 text-xs font-mono">{GAME_TYPE_LABELS[g.game_type]} · {locationLabel(g)} · {timeStr}</p>
                      </div>
                    </button>
                  );
                }
              })}
            </div>
            <button type="button" onClick={() => setDayPopover(null)}
              className="mt-3 w-full text-gray-500 text-xs font-mono hover:text-gray-300 transition-colors">
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* Hover tooltip */}
      {tooltip && (() => {
        const ev = tooltip.ev;
        // Clamp so tooltip doesn't overflow right edge of viewport
        const x = Math.min(tooltip.x, (typeof window !== "undefined" ? window.innerWidth : 800) - 220);
        if (ev.kind === "session") {
          const s        = ev.data;
          const color    = colorFor(s.team_id);
          const teamName = teams.find((t) => t.id === s.team_id)?.name;
          const totalMin = s.drills.reduce((sum, d) => sum + d.duration, 0);
          const end      = totalMin > 0 ? addMinutes(s.start_time, totalMin) : null;
          return (
            <div
              className="fixed z-[60] pointer-events-none"
              style={{ left: x, top: tooltip.y }}
            >
              <div className={`min-w-[180px] max-w-[220px] rounded-xl border ${color.border} ${color.bg} backdrop-blur-sm p-3 shadow-2xl`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Dumbbell size={12} className={color.text} />
                  <p className={`text-xs font-semibold ${color.text}`}>Practice</p>
                </div>
                {teamName && <p className="text-white text-xs font-medium">{teamName}</p>}
                <p className="text-gray-400 text-[10px] font-mono">{formatDisplayDate(s.date)}</p>
                <p className="text-gray-400 text-[10px] font-mono">
                  {formatTime12(s.start_time)}{end ? ` – ${end}` : ""}{totalMin > 0 ? ` (${totalMin} min)` : ""}
                </p>
                {s.label && <p className="text-gray-500 text-[10px] font-mono mt-0.5">{s.label}</p>}
              </div>
            </div>
          );
        } else {
          const g       = ev.data;
          const gcls    = gameColorCls(g);
          const teamName = teams.find((t) => t.id === g.team_id)?.name;
          const timeStr  = g.time_tbd ? "TBD" : g.game_time ? formatTime12(g.game_time) : "Time TBD";
          const scored   = g.score_us !== null && g.score_them !== null;
          return (
            <div
              className="fixed z-[60] pointer-events-none"
              style={{ left: x, top: tooltip.y }}
            >
              <div className={`min-w-[180px] max-w-[220px] rounded-xl border ${gcls.border} ${gcls.bg} backdrop-blur-sm p-3 shadow-2xl`}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Swords size={12} className={gcls.text} />
                  <p className={`text-xs font-semibold ${gcls.text}`}>{GAME_TYPE_LABELS[g.game_type]}</p>
                </div>
                <p className="text-white text-xs font-medium">vs {g.opponent}</p>
                {teamName && <p className="text-gray-400 text-[10px] font-mono">{teamName}</p>}
                <p className="text-gray-400 text-[10px] font-mono">{formatDisplayDate(g.game_date)}</p>
                <p className="text-gray-400 text-[10px] font-mono">{timeStr} · {g.location_type === "home" ? "Home" : g.location_type === "away" ? "Away" : "Neutral"}</p>
                {g.venue && <p className="text-gray-500 text-[10px] font-mono truncate">{g.venue}</p>}
                {scored && (
                  <p className={`text-[10px] font-mono font-semibold mt-1 ${(g.score_us ?? 0) > (g.score_them ?? 0) ? "text-emerald-400" : "text-red-400"}`}>
                    {(g.score_us ?? 0) > (g.score_them ?? 0) ? "W" : "L"} {g.score_us}–{g.score_them}
                  </p>
                )}
              </div>
            </div>
          );
        }
      })()}
    </>
  );
}
