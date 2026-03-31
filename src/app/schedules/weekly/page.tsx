"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Loader2, CalendarDays, ChevronLeft, ChevronRight, Clock, X, List, Eye, Pencil, Printer, AlertCircle, Upload, CheckCircle2 } from "lucide-react";
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

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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

type ViewMode = "agenda" | "calendar";

// ── Main page ──────────────────────────────────────────────────────────────

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

  const [view,         setView]         = useState<ViewMode>("agenda");
  const [selectedDay,  setSelectedDay]  = useState<string | null>(null);

  const { authUser, isPlayer, isAdmin, isCoach, isManager } = useAuth();
  const canEdit    = isAdmin || isCoach || isManager;
  const canPreview = isAdmin || isCoach || isManager || isPlayer;
  useEffect(() => {
    if (isPlayer && authUser?.teamId) setFilterTeam(authUser.teamId);
  }, [isPlayer, authUser?.teamId]);

  useEffect(() => {
    fetch("/api/attendance/consequences")
      .then((r) => r.ok ? r.json() : [])
      .then((rows: { event_type: string; status: string; makeup_work: string }[]) => {
        const map: Record<string, string> = {};
        for (const r of rows) map[`${r.event_type}:${r.status}`] = r.makeup_work;
        setConsequences(map);
      })
      .catch(() => {});
  }, []);

  // Absence sheet state
  const [absenceSheet, setAbsenceSheet]           = useState<EventItem | null>(null);
  const [absenceReason, setAbsenceReason]         = useState("");
  const [submittingAbsence, setSubmittingAbsence] = useState(false);
  const [reportedDates, setReportedDates]         = useState<Set<string>>(new Set());

  // Makeup tracking: date → { id, makeup_required, makeup_completed_at, makeup_proof_name, event_type, status }
  const [makeupByDate, setMakeupByDate]           = useState<Record<string, MakeupRecord>>({});
  const [uploadingDate, setUploadingDate]         = useState<string | null>(null);
  const [uploadError, setUploadError]             = useState<string | null>(null);
  const [consequences, setConsequences]           = useState<Record<string, string>>({});

  // ── Labels ────────────────────────────────────────────────────────────────

  const weekLabel = `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  const monthLabel = weekOf.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // ── Navigation ────────────────────────────────────────────────────────────

  const prevPeriod = () => {
    if (view === "calendar") {
      const d = new Date(weekOf.getFullYear(), weekOf.getMonth() - 1, 1);
      setWeekOf(d);
      setSelectedDay(null);
    } else {
      const d = new Date(weekOf); d.setDate(d.getDate() - 7); setWeekOf(d);
    }
  };
  const nextPeriod = () => {
    if (view === "calendar") {
      const d = new Date(weekOf.getFullYear(), weekOf.getMonth() + 1, 1);
      setWeekOf(d);
      setSelectedDay(null);
    } else {
      const d = new Date(weekOf); d.setDate(d.getDate() + 7); setWeekOf(d);
    }
  };
  const goToday = () => { setWeekOf(new Date()); setSelectedDay(null); };

  // ── Data fetch ────────────────────────────────────────────────────────────

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

  // ── Absence submit ────────────────────────────────────────────────────────

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
          event_type:    absenceSheet.kind === "game" ? "game" : "practice",
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

  // ── Events (week-scoped, for agenda view) ─────────────────────────────────

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

  // ── Events (month-scoped, for calendar view) ──────────────────────────────

  const calendarEvents = useMemo<EventItem[]>(() => {
    const ms = new Date(weekOf.getFullYear(), weekOf.getMonth(), 1);
    const me = new Date(weekOf.getFullYear(), weekOf.getMonth() + 1, 0, 23, 59, 59);
    const fromStr = toISO(ms);
    const toStr   = toISO(me);

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
  }, [games, sessions, practices, filterTeam, weekOf]);

  const calendarByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const e of calendarEvents) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return map;
  }, [calendarEvents]);

  // ── Agenda byDate ─────────────────────────────────────────────────────────

  const byDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const e of events) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date)!.push(e);
    }
    return Array.from(map.entries());
  }, [events]);

  // ── Load absence records for visible event dates ──────────────────────────

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
      const makeup: Record<string, MakeupRecord> = {};
      results.forEach((records: { player_id: string; id: string; status: string; event_type: string; makeup_required: boolean; makeup_completed_at: string | null; makeup_proof_name: string | null }[], i) => {
        if (!Array.isArray(records)) return;
        const myRecord = records.find((r) => r.player_id === pid);
        if (myRecord) {
          reported.add(dates[i]);
          if (myRecord.makeup_required) {
            makeup[dates[i]] = {
              id:                  myRecord.id,
              makeup_required:     myRecord.makeup_required,
              makeup_completed_at: myRecord.makeup_completed_at,
              makeup_proof_name:   myRecord.makeup_proof_name,
              event_type:          (myRecord.event_type ?? "practice") as "practice" | "game",
              status:              (myRecord.status ?? "unexcused") as "excused" | "unexcused",
            };
          }
        }
      });
      setReportedDates(reported);
      setMakeupByDate(makeup);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, isPlayer, authUser?.playerId, authUser?.teamId, loading]);

  // ── Selected day events (calendar view) ───────────────────────────────────

  const selectedDayItems = selectedDay ? (calendarByDate.get(selectedDay) ?? []) : [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Weekly Events</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">
            {view === "calendar" ? monthLabel.toUpperCase() : weekLabel}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-0.5 bg-gray-800 border border-gray-700 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setView("agenda")}
              title="Agenda view"
              className={`p-1.5 rounded-lg transition-colors ${view === "agenda" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              <List size={15} />
            </button>
            <button
              type="button"
              onClick={() => setView("calendar")}
              title="Calendar view"
              className={`p-1.5 rounded-lg transition-colors ${view === "calendar" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}
            >
              <CalendarDays size={15} />
            </button>
          </div>

          {/* Navigation */}
          <button onClick={prevPeriod} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={goToday} className="px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white text-xs font-mono transition-colors">Today</button>
          <button onClick={nextPeriod} className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Team filter pills ───────────────────────────────────────────── */}
      {teams.length > 1 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <button onClick={() => setFilterTeam("all")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors font-mono ${filterTeam === "all" ? "bg-coaches-red border-coaches-red text-white" : "border-gray-700 text-gray-400 hover:text-white"}`}>All Teams</button>
          {teams.map((t) => (
            <button key={t.id} onClick={() => setFilterTeam(t.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors font-mono ${filterTeam === t.id ? "bg-coaches-red border-coaches-red text-white" : "border-gray-700 text-gray-400 hover:text-white"}`}>{t.name}</button>
          ))}
        </div>
      )}

      {loading && <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-coaches-red" /></div>}

      {/* ── Calendar view ──────────────────────────────────────────────── */}
      {!loading && view === "calendar" && (
        <div className="flex flex-col gap-4">
          <MonthGrid
            weekOf={weekOf}
            today={today}
            byDate={calendarByDate}
            selectedDay={selectedDay}
            onSelectDay={(iso) => setSelectedDay((prev) => prev === iso ? null : iso)}
          />

          {/* Selected day panel */}
          {selectedDay && selectedDayItems.length > 0 && (() => {
            const { weekday, short } = fmtDate(selectedDay);
            const isToday = selectedDay === toISO(today);
            return (
              <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
                <div className={`flex items-center justify-between gap-3 px-4 py-2 ${isToday ? "bg-coaches-red/10" : "bg-gray-800/40"}`}>
                  <div className="flex items-center gap-3">
                    <p className={`text-xs font-mono font-semibold uppercase tracking-wider ${isToday ? "text-coaches-red" : "text-gray-400"}`}>{weekday}</p>
                    <p className={`text-xs font-mono ${isToday ? "text-coaches-red/80" : "text-gray-500"}`}>{short}</p>
                    {isToday && <span className="text-[9px] font-mono bg-coaches-red text-white px-1.5 py-0.5 rounded-full">TODAY</span>}
                  </div>
                  <button type="button" onClick={() => setSelectedDay(null)} className="text-gray-600 hover:text-gray-400 transition-colors">
                    <X size={14} />
                  </button>
                </div>
                {renderEventItems(selectedDayItems, isPlayer, canEdit, canPreview, reportedDates, makeupByDate, uploadingDate, uploadError, locations, setAbsenceSheet, setMakeupByDate, setUploadingDate, setUploadError, consequences)}
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Agenda view ────────────────────────────────────────────────── */}
      {!loading && view === "agenda" && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <CalendarDays size={40} className="text-gray-700" />
          <p className="text-gray-500 font-mono text-sm">No events this week.</p>
        </div>
      )}

      {!loading && view === "agenda" && (
        <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
          {byDate.map(([date, items], di) => {
            const { weekday, short } = fmtDate(date);
            const isToday = date === toISO(today);
            return (
              <div key={date} className={di > 0 ? "border-t border-gray-700" : ""}>
                <div className={`flex items-center gap-3 px-4 py-2 ${isToday ? "bg-coaches-red/10" : "bg-gray-800/40"}`}>
                  <p className={`text-xs font-mono font-semibold uppercase tracking-wider ${isToday ? "text-coaches-red" : "text-gray-400"}`}>{weekday}</p>
                  <p className={`text-xs font-mono ${isToday ? "text-coaches-red/80" : "text-gray-500"}`}>{short}</p>
                  {isToday && <span className="text-[9px] font-mono bg-coaches-red text-white px-1.5 py-0.5 rounded-full">TODAY</span>}
                </div>
                {renderEventItems(items, isPlayer, canEdit, canPreview, reportedDates, makeupByDate, uploadingDate, uploadError, locations, setAbsenceSheet, setMakeupByDate, setUploadingDate, setUploadError)}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Absence report sheet (players only) ────────────────────────── */}
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
              <div className="w-10 h-1 rounded-full bg-gray-700 mx-auto -mt-1 mb-1" />
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white font-semibold">Can&apos;t make it?</p>
                  <p className="text-gray-400 text-sm mt-0.5 font-mono">{label} · {weekday}, {short}</p>
                </div>
                <button onClick={() => { setAbsenceSheet(null); setAbsenceReason(""); }} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>
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
              <div className="flex gap-3">
                <button onClick={() => { setAbsenceSheet(null); setAbsenceReason(""); }} className="px-5 py-3 rounded-xl border border-gray-700 text-gray-400 text-sm transition-colors">Cancel</button>
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

// ── Types for makeup tracking ──────────────────────────────────────────────
type MakeupRecord = { id: string; makeup_required: boolean; makeup_completed_at: string | null; makeup_proof_name: string | null; event_type: "practice" | "game"; status: "excused" | "unexcused" };

// ── Event row renderer (shared by agenda + calendar day panel) ─────────────

function renderEventItems(
  items: EventItem[],
  isPlayer: boolean,
  canEdit: boolean,
  canPreview: boolean,
  reportedDates: Set<string>,
  makeupByDate: Record<string, MakeupRecord>,
  uploadingDate: string | null,
  uploadError: string | null,
  locations: ReturnType<typeof useLocations>["locations"],
  setAbsenceSheet: (ev: EventItem) => void,
  setMakeupByDate: React.Dispatch<React.SetStateAction<Record<string, MakeupRecord>>>,
  setUploadingDate: (d: string | null) => void,
  setUploadError: (e: string | null) => void,
  consequences: Record<string, string>,
) {
  return items.map((ev, i) => {
    const key      = ev.kind === "game" ? ev.game.id : ev.kind === "session" ? ev.session.id : ev.practice.id;
    const reported = reportedDates.has(ev.date);
    const border   = i < items.length - 1 ? "border-b border-gray-800" : "";

    // ── Staff action buttons (Coach / Admin / Manager) ──────────────────────
    function StaffButtons() {
      if (isPlayer || (!canEdit && !canPreview)) return null;

      if (ev.kind === "session") {
        const qp = new URLSearchParams({ date: ev.session.date });
        if (ev.session.team_id) qp.set("team_id", ev.session.team_id);
        if (ev.session.label)   qp.set("label", ev.session.label);
        const viewUrl  = `/view-plans/${ev.session.date}?${qp}`;
        const editUrl  = `/planner?${qp}`;
        const printUrl = `${viewUrl}&autoprint=1`;
        return (
          <div className="flex items-center gap-1 mt-2">
            {canPreview && <ActionBtn href={viewUrl} icon={<Eye size={10}/>} label="Preview" />}
            {canEdit    && <ActionBtn href={editUrl} icon={<Pencil size={10}/>} label="Edit" />}
            {canEdit    && <ActionBtn href={printUrl} icon={<Printer size={10}/>} label="Print" newTab />}
          </div>
        );
      }
      if (ev.kind === "schedule") {
        return (
          <div className="flex items-center gap-1 mt-2">
            {canPreview && <ActionBtn href="/schedules/practice" icon={<Eye size={10}/>} label="Preview" />}
            {canEdit    && <ActionBtn href="/schedules/practice" icon={<Pencil size={10}/>} label="Edit" />}
          </div>
        );
      }
      if (ev.kind === "game") {
        return (
          <div className="flex items-center gap-1 mt-2">
            {canPreview && <ActionBtn href="/schedules/game" icon={<Eye size={10}/>} label="Preview" />}
            {canEdit    && <ActionBtn href="/schedules/game" icon={<Pencil size={10}/>} label="Edit" />}
          </div>
        );
      }
      return null;
    }

    // ── Player action buttons ───────────────────────────────────────────────
    function PlayerButtons() {
      if (!isPlayer) return null;
      return (
        <div className="flex items-center gap-1 mt-2">
          {ev.kind === "session" && (() => {
            const qp = new URLSearchParams({ date: ev.session.date });
            if (ev.session.team_id) qp.set("team_id", ev.session.team_id);
            if (ev.session.label)   qp.set("label", ev.session.label);
            return <ActionBtn href={`/view-plans/${ev.session.date}?${qp}`} icon={<Eye size={10}/>} label="Preview" />;
          })()}
          <button
            type="button"
            onClick={() => setAbsenceSheet(ev)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-700/60 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 text-[10px] font-mono transition-colors"
          >
            <AlertCircle size={10} /> Report Absence
          </button>
        </div>
      );
    }

    // ── Game row ────────────────────────────────────────────────────────────
    if (ev.kind === "game") {
      const g = ev.game;
      const timeStr  = g.time_tbd ? "Time TBD" : g.game_time ? fmt12h(g.game_time) : "Time TBD";
      const locLabel = g.location_type === "home" ? "Home" : g.location_type === "away" ? "Away" : "Neutral";
      const matchedLoc = g.venue ? locations.find((l) => [l.name, l.address, l.city].filter(Boolean).join(", ") === g.venue) : null;
      const departureTime =
        (g.location_type === "away" || g.location_type === "neutral") &&
        g.game_time && !g.time_tbd && matchedLoc
          ? subtractMins(g.game_time, matchedLoc.default_travel_time + 90) : null;
      const arrivalTime =
        g.location_type === "home" && g.game_time && !g.time_tbd
          ? subtractMins(g.game_time, 90) : null;

      return (
        <div key={key} className={`flex items-start gap-3 px-4 py-3 ${border}`}>
          <div className="w-2 h-2 rounded-full shrink-0 bg-coaches-red mt-1.5" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-white text-sm font-medium">Game — vs. {g.opponent}</p>
              {reported && <span className="text-[9px] font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full shrink-0">Reported</span>}
            </div>
            <p className="text-gray-500 text-[11px] font-mono mt-0.5">{GAME_TYPE_LABELS[g.game_type]} · {locLabel} · {timeStr}</p>
            {g.game_note && <p className="text-purple-400 text-[11px] font-mono mt-0.5">{g.game_note}</p>}
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
            <StaffButtons />
            <PlayerButtons />
          </div>
        </div>
      );
    }

    // ── Practice / Session row ──────────────────────────────────────────────
    let typeLabel = "";
    let timeStr   = "";
    let dotColor  = "";

    if (ev.kind === "session") {
      const totalMin = ev.session.drills.reduce((s, d) => s + d.duration, 0);
      typeLabel = "Practice" + (ev.session.label ? ` — ${ev.session.label}` : "");
      timeStr   = totalMin > 0
        ? `${fmt12h(ev.session.start_time)} – ${fmt12h(addMins(ev.session.start_time, totalMin))}`
        : fmt12h(ev.session.start_time);
      dotColor = "bg-coaches-blue";
    } else {
      typeLabel = "Practice";
      timeStr   = `${fmt12h(ev.practice.start_time)} – ${fmt12h(ev.practice.end_time)}`;
      dotColor  = "bg-sky-400";
    }

    const makeup = isPlayer ? makeupByDate[ev.date] ?? null : null;

    return (
      <div key={key} className={`flex items-start gap-3 px-4 py-3 ${border}`}>
        <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${dotColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-white text-sm font-medium">{typeLabel}</p>
            {reported && <span className="text-[9px] font-mono text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full shrink-0">Reported</span>}
          </div>
          <p className="text-gray-500 text-[11px] font-mono mt-0.5">{timeStr}</p>
          <StaffButtons />
          <PlayerButtons />

          {/* Makeup card — shown to players when coach assigned makeup work */}
          {makeup && makeup.makeup_required && (
            <div className={`mt-2 rounded-xl border px-3 py-2.5 ${makeup.makeup_completed_at ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
              {makeup.makeup_completed_at ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  <div>
                    <p className="text-emerald-400 text-xs font-semibold">Makeup complete</p>
                    {makeup.makeup_proof_name && (
                      <p className="text-gray-500 text-[10px] font-mono mt-0.5">{makeup.makeup_proof_name}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle size={13} className="text-amber-400 shrink-0" />
                    <p className="text-amber-400 text-xs font-semibold">Makeup work assigned</p>
                  </div>
                  {(() => {
                    const work = consequences[`${makeup.event_type}:${makeup.status}`];
                    return work ? <p className="text-amber-300 text-xs mb-2">{work}</p> : null;
                  })()}
                  {uploadError && uploadingDate === ev.date && (
                    <p className="text-red-400 text-[10px] mb-1">{uploadError}</p>
                  )}
                  <label className={`inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${uploadingDate === ev.date ? "opacity-50 cursor-wait border-gray-600 text-gray-500" : "border-amber-500/50 text-amber-400 hover:border-amber-400 hover:bg-amber-500/10"}`}>
                    <Upload size={11} />
                    {uploadingDate === ev.date ? "Uploading…" : "Upload proof"}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      disabled={uploadingDate === ev.date}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !makeup) return;
                        setUploadingDate(ev.date);
                        setUploadError(null);
                        const fd = new FormData();
                        fd.append("attendance_id", makeup.id);
                        fd.append("file", file);
                        const res = await fetch("/api/attendance/proof", { method: "POST", body: fd });
                        if (!res.ok) {
                          const j = await res.json().catch(() => ({}));
                          setUploadError(j.error ?? "Upload failed");
                        } else {
                          const updated = await res.json();
                          setMakeupByDate((prev) => ({
                            ...prev,
                            [ev.date]: {
                              ...prev[ev.date]!,
                              makeup_completed_at: updated.makeup_completed_at,
                              makeup_proof_name:   updated.makeup_proof_name,
                            },
                          }));
                        }
                        setUploadingDate(null);
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  });
}

// ── Shared small action button ─────────────────────────────────────────────

function ActionBtn({ href, icon, label, newTab }: { href: string; icon: React.ReactNode; label: string; newTab?: boolean }) {
  return (
    <a
      href={href}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noreferrer" : undefined}
      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-700/60 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 text-[10px] font-mono transition-colors"
    >
      {icon} {label}
    </a>
  );
}

// ── Month grid calendar ────────────────────────────────────────────────────

const DAY_HEADERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function MonthGrid({
  weekOf,
  today,
  byDate,
  selectedDay,
  onSelectDay,
}: {
  weekOf: Date;
  today: Date;
  byDate: Map<string, EventItem[]>;
  selectedDay: string | null;
  onSelectDay: (iso: string) => void;
}) {
  const todayStr = toISO(today);
  const year  = weekOf.getFullYear();
  const month = weekOf.getMonth();

  // Build grid: pad to full Sun–Sat weeks
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth  = new Date(year, month + 1, 0);

  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());

  const gridEnd = new Date(lastOfMonth);
  gridEnd.setDate(lastOfMonth.getDate() + (6 - lastOfMonth.getDay()));

  const cells: Date[] = [];
  const cur = new Date(gridStart);
  while (cur <= gridEnd) {
    cells.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }

  return (
    <div>
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-[10px] font-mono text-gray-600 uppercase tracking-wider pb-1.5">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-700/50 rounded-2xl overflow-hidden border border-gray-700/50">
        {cells.map((date) => {
          const iso       = toISO(date);
          const dayEvents = byDate.get(iso) ?? [];
          const inMonth   = date.getMonth() === month;
          const isToday   = iso === todayStr;
          const isSelected = iso === selectedDay;

          const gameCount     = dayEvents.filter((e) => e.kind === "game").length;
          const practiceCount = dayEvents.filter((e) => e.kind !== "game").length;

          return (
            <button
              key={iso}
              type="button"
              onClick={() => dayEvents.length > 0 ? onSelectDay(iso) : undefined}
              className={`
                group text-left bg-gray-900 min-h-[72px] sm:min-h-[88px] p-2 transition-colors
                ${dayEvents.length > 0 ? "cursor-pointer hover:bg-gray-800" : "cursor-default"}
                ${isSelected ? "ring-1 ring-inset ring-coaches-red bg-coaches-red/5" : ""}
              `}
            >
              {/* Date number */}
              <div className="flex items-start justify-between mb-1">
                <span
                  className={`
                    text-xs font-mono w-6 h-6 flex items-center justify-center rounded-full leading-none
                    ${isToday ? "bg-coaches-red text-white font-bold" :
                      inMonth ? "text-white" : "text-gray-600"}
                  `}
                >
                  {date.getDate()}
                </span>
              </div>

              {/* Event indicators */}
              {dayEvents.length > 0 && (
                <>
                  {/* Dots: always visible */}
                  <div className="flex gap-0.5 flex-wrap">
                    {gameCount > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-coaches-red shrink-0" />
                    )}
                    {practiceCount > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-coaches-blue shrink-0" />
                    )}
                  </div>

                  {/* Chips: show on sm+ screens */}
                  <div className="hidden sm:flex flex-col gap-0.5 mt-1">
                    {dayEvents.slice(0, 2).map((ev, i) => {
                      const label =
                        ev.kind === "game"    ? `vs ${ev.game.opponent}` :
                        ev.kind === "session" ? (ev.session.label || "Practice") :
                        "Practice";
                      const colorCls =
                        ev.kind === "game"    ? "text-coaches-red bg-coaches-red/10" :
                        ev.kind === "session" ? "text-coaches-blue bg-coaches-blue/10" :
                        "text-sky-400 bg-sky-400/10";
                      return (
                        <span
                          key={i}
                          className={`text-[9px] font-mono truncate px-1 py-px rounded leading-tight ${colorCls}`}
                        >
                          {label}
                        </span>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] font-mono text-gray-500 px-1">+{dayEvents.length - 2} more</span>
                    )}
                  </div>
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-coaches-red shrink-0" />
          <span className="text-[10px] font-mono text-gray-500">Game</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-coaches-blue shrink-0" />
          <span className="text-[10px] font-mono text-gray-500">Practice</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
          <span className="text-[10px] font-mono text-gray-500">Scheduled</span>
        </div>
      </div>
    </div>
  );
}
