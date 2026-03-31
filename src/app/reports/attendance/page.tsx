"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CalendarDays, Users, CheckCircle2, XCircle,
  AlertCircle, Upload, Eye, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useTeam }     from "@/context/TeamContext";
import { useSettings } from "@/context/SettingsContext";
import type {
  AttendanceReport,
  AttendanceRecord,
  PlayerAttendanceRow,
} from "@/app/api/attendance/report/route";
import type { AttendanceConsequence } from "@/app/api/attendance/consequences/route";

type ConsequenceMap = Record<string, string>;
type ViewMode = "date" | "athlete";
type Preset   = "season" | "30d" | "14d" | "7d" | "custom";

// ── Helpers ────────────────────────────────────────────────────────────────

function isoToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDateFull(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

const PRESETS: { id: Preset; label: string }[] = [
  { id: "season", label: "All Season" },
  { id: "30d",    label: "Last 30 Days" },
  { id: "14d",    label: "Last 14 Days" },
  { id: "7d",     label: "Last 7 Days" },
  { id: "custom", label: "Custom" },
];

// ── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ rec }: { rec: AttendanceRecord }) {
  if (!rec.reviewed_at) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold uppercase">
        In Review
      </span>
    );
  }
  if (rec.status === "excused") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold uppercase">
        <CheckCircle2 size={9} /> Excused
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-mono font-bold uppercase">
      <XCircle size={9} /> Unexcused
    </span>
  );
}

// ── Inline review panel (shared by both views) ────────────────────────────

function ReviewPanel({
  rec,
  date,
  consequences,
  onUpdated,
  onClose,
}: {
  rec:          AttendanceRecord;
  date:         string;
  consequences: ConsequenceMap;
  onUpdated:    (date: string, rec: AttendanceRecord) => void;
  onClose:      () => void;
}) {
  const [status, setStatus] = useState<"excused" | "unexcused">(rec.status);
  const [notes,  setNotes]  = useState(rec.notes ?? "");
  const [saving, setSaving] = useState(false);

  const makeupWork = consequences[`${rec.event_type}:${status}`] ?? "";

  async function save() {
    setSaving(true);
    const res = await fetch("/api/attendance", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: rec.id, status, notes }),
    });
    if (res.ok) {
      onUpdated(date, await res.json());
      onClose();
    }
    setSaving(false);
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-700/60">
      <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-2">Review Absence</p>
      <div className="flex gap-2 mb-3">
        {(["excused", "unexcused"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              status === s
                ? s === "excused"
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                  : "bg-red-500/20 border-red-500 text-red-400"
                : "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300"
            }`}
          >
            {s === "excused" ? "Excused" : "Unexcused"}
          </button>
        ))}
      </div>
      {makeupWork && (
        <div className="mb-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
          <p className="text-[9px] font-mono text-amber-500 uppercase tracking-wider mb-0.5">Makeup Work</p>
          <p className="text-amber-300 text-sm">{makeupWork}</p>
        </div>
      )}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Coach note (optional)"
        rows={2}
        className="w-full bg-gray-900 border border-gray-700 rounded-xl text-white text-sm px-3 py-2 resize-none focus:outline-none focus:border-gray-500 mb-3"
      />
      <div className="flex gap-2">
        <button type="button" onClick={onClose}
          className="flex-1 py-2 rounded-xl border border-gray-700 text-gray-400 text-sm hover:border-gray-500 transition-colors">
          Cancel
        </button>
        <button type="button" onClick={save} disabled={saving}
          className="flex-1 py-2 rounded-xl bg-coaches-red text-white text-sm font-semibold disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
          {saving && <Loader2 size={13} className="animate-spin" />}
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

// ── Absence card (used in both views) ─────────────────────────────────────

function AbsenceCard({
  playerName,
  jerseyNumber,
  date,
  rec,
  consequences,
  showDate,
  showPlayer,
  onUpdated,
}: {
  playerName:   string;
  jerseyNumber: number | null;
  date:         string;
  rec:          AttendanceRecord;
  consequences: ConsequenceMap;
  showDate:     boolean;
  showPlayer:   boolean;
  onUpdated:    (date: string, rec: AttendanceRecord) => void;
}) {
  const [reviewing,   setReviewing]   = useState(false);
  const [uploadErr,   setUploadErr]   = useState<string | null>(null);
  const [uploading,   setUploading]   = useState(false);
  const [localRec,    setLocalRec]    = useState(rec);

  // Keep localRec in sync if parent updates the record
  useEffect(() => { setLocalRec(rec); }, [rec]);

  function handleUpdated(d: string, updated: AttendanceRecord) {
    setLocalRec(updated);
    onUpdated(d, updated);
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {showPlayer && (
            <div className="flex items-center gap-2 mb-1">
              <p className="text-white font-semibold text-sm truncate">{playerName}</p>
              {jerseyNumber != null && (
                <span className="text-gray-500 font-mono text-xs shrink-0">#{jerseyNumber}</span>
              )}
            </div>
          )}
          {showDate && (
            <p className="text-white font-semibold text-sm mb-1">{fmtDateFull(date)}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border ${
              localRec.event_type === "game"
                ? "text-sky-400 border-sky-500/30 bg-sky-500/10"
                : "text-gray-400 border-gray-600 bg-gray-700/40"
            }`}>
              {localRec.event_type}
            </span>
            <StatusBadge rec={localRec} />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setReviewing((v) => !v)}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-xs font-semibold transition-colors"
        >
          {reviewing ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {reviewing ? "Close" : "Review"}
        </button>
      </div>

      {/* Makeup work (after review) */}
      {localRec.reviewed_at && (() => {
        const work = consequences[`${localRec.event_type}:${localRec.status}`];
        return work ? (
          <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
            <p className="text-[9px] font-mono text-amber-500 uppercase tracking-wider mb-0.5">Makeup Work</p>
            <p className="text-amber-300 text-sm">{work}</p>
          </div>
        ) : null;
      })()}

      {/* Proof status */}
      {localRec.reviewed_at && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${
            localRec.makeup_completed_at
              ? "text-sky-400 bg-sky-500/10 border-sky-500/30"
              : "text-amber-400 bg-amber-500/10 border-amber-500/30"
          }`}>
            <AlertCircle size={9} />
            {localRec.makeup_completed_at ? "Makeup done" : "Makeup required"}
          </span>
          {localRec.makeup_proof_url && (
            <a
              href={`/api/attendance/proof?attendance_id=${localRec.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-sky-400 hover:underline"
            >
              <Eye size={10} /> View proof
            </a>
          )}
          {!localRec.makeup_completed_at && (
            <label className="inline-flex items-center gap-1 cursor-pointer text-[10px] text-gray-500 hover:text-sky-400 transition-colors">
              {uploading ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />}
              Upload proof
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  setUploadErr(null);
                  const fd = new FormData();
                  fd.append("attendance_id", localRec.id);
                  fd.append("file", file);
                  const res = await fetch("/api/attendance/proof", { method: "POST", body: fd });
                  if (!res.ok) {
                    const j = await res.json().catch(() => ({}));
                    setUploadErr(j.error ?? "Upload failed");
                  } else {
                    const updated = await res.json();
                    const next = {
                      ...localRec,
                      makeup_proof_url:    updated.makeup_proof_url,
                      makeup_proof_name:   updated.makeup_proof_name,
                      makeup_completed_at: updated.makeup_completed_at,
                    };
                    setLocalRec(next);
                    onUpdated(date, next);
                  }
                  setUploading(false);
                }}
              />
            </label>
          )}
          {uploadErr && <p className="text-red-400 text-[10px]">{uploadErr}</p>}
        </div>
      )}

      {/* Notes */}
      {localRec.notes && !reviewing && (
        <p className="mt-2 text-gray-500 text-xs italic">"{localRec.notes}"</p>
      )}

      {/* Review panel */}
      {reviewing && (
        <ReviewPanel
          rec={localRec}
          date={date}
          consequences={consequences}
          onUpdated={handleUpdated}
          onClose={() => setReviewing(false)}
        />
      )}
    </div>
  );
}

// ── By Date view ───────────────────────────────────────────────────────────

function ByDateView({
  report,
  consequences,
  onUpdated,
}: {
  report:       AttendanceReport;
  consequences: ConsequenceMap;
  onUpdated:    (playerId: string, date: string, rec: AttendanceRecord) => void;
}) {
  const { dates, players } = report;
  const [selectedDate, setSelectedDate] = useState<string>(dates[dates.length - 1] ?? "");

  // Build date → player absences map
  const byDate = useMemo(() => {
    const map = new Map<string, { player: PlayerAttendanceRow; rec: AttendanceRecord }[]>();
    for (const date of dates) {
      const entries = players
        .filter((p) => p.records[date])
        .map((p) => ({ player: p, rec: p.records[date] }));
      if (entries.length) map.set(date, entries);
    }
    return map;
  }, [dates, players]);

  const selectedEntries = byDate.get(selectedDate) ?? [];

  if (dates.length === 0) {
    return <EmptyState />;
  }

  return (
    <div>
      {/* Date selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {[...dates].reverse().map((d) => {
          const count = byDate.get(d)?.length ?? 0;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDate(d)}
              className={`shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                selectedDate === d
                  ? "bg-coaches-red border-coaches-red text-white"
                  : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white"
              }`}
            >
              <span>{fmtDate(d)}</span>
              <span className={`text-[10px] font-mono mt-0.5 ${selectedDate === d ? "text-red-200" : "text-gray-600"}`}>
                {count} absent
              </span>
            </button>
          );
        })}
      </div>

      {/* Cards for selected date */}
      {selectedDate && (
        <>
          <p className="text-gray-500 text-xs font-mono uppercase tracking-wider mb-3">
            {fmtDateFull(selectedDate)} · {selectedEntries.length} absent
          </p>
          {selectedEntries.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">No absences on this date.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {selectedEntries.map(({ player, rec }) => (
                <AbsenceCard
                  key={player.player_id}
                  playerName={player.full_name}
                  jerseyNumber={player.jersey_number}
                  date={selectedDate}
                  rec={rec}
                  consequences={consequences}
                  showDate={false}
                  showPlayer={true}
                  onUpdated={(date, updated) => onUpdated(player.player_id, date, updated)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── By Athlete view ────────────────────────────────────────────────────────

function AthleteCard({
  row,
  consequences,
  onUpdated,
}: {
  row:          PlayerAttendanceRow;
  consequences: ConsequenceMap;
  onUpdated:    (playerId: string, date: string, rec: AttendanceRecord) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const total = row.totals.excused + row.totals.unexcused;
  const pending = Object.values(row.records).filter((r) => !r.reviewed_at).length;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-700/20 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-700 border border-gray-600 flex items-center justify-center shrink-0">
            <span className="text-white font-bold font-mono text-sm">
              {row.jersey_number != null ? `#${row.jersey_number}` : row.full_name[0]}
            </span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{row.full_name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-gray-500 text-[10px] font-mono">{total} absence{total !== 1 ? "s" : ""}</span>
              {pending > 0 && (
                <span className="text-amber-400 text-[10px] font-mono bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                  {pending} in review
                </span>
              )}
              {row.totals.makeup_required > row.totals.makeup_done && (
                <span className="text-red-400 text-[10px] font-mono bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded-full">
                  {row.totals.makeup_required - row.totals.makeup_done} makeup pending
                </span>
              )}
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-gray-500 shrink-0" /> : <ChevronDown size={16} className="text-gray-500 shrink-0" />}
      </button>

      {/* Expanded absences */}
      {expanded && (
        <div className="border-t border-gray-700/60 px-4 py-3 flex flex-col gap-3">
          {Object.entries(row.records)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, rec]) => (
              <AbsenceCard
                key={date}
                playerName={row.full_name}
                jerseyNumber={row.jersey_number}
                date={date}
                rec={rec}
                consequences={consequences}
                showDate={true}
                showPlayer={false}
                onUpdated={(d, updated) => onUpdated(row.player_id, d, updated)}
              />
            ))}
        </div>
      )}
    </div>
  );
}

function ByAthleteView({
  report,
  consequences,
  onUpdated,
}: {
  report:       AttendanceReport;
  consequences: ConsequenceMap;
  onUpdated:    (playerId: string, date: string, rec: AttendanceRecord) => void;
}) {
  if (report.players.length === 0) return <EmptyState />;

  return (
    <div className="flex flex-col gap-3">
      {report.players.map((row) => (
        <AthleteCard
          key={row.player_id}
          row={row}
          consequences={consequences}
          onUpdated={onUpdated}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="py-16 text-center text-gray-500 font-mono text-xs">
      NO ABSENCES FOR THIS PERIOD
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function AttendanceReportPage() {
  const { activeTeam } = useTeam();
  const { settings }   = useSettings();
  const today          = isoToday();
  const seasonStart    = settings.season_start ?? undefined;

  const [preset,       setPreset]       = useState<Preset>("season");
  const [customFrom,   setCustomFrom]   = useState(seasonStart ?? daysAgo(30));
  const [customTo,     setCustomTo]     = useState(today);
  const [report,       setReport]       = useState<AttendanceReport | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [consequences, setConsequences] = useState<ConsequenceMap>({});
  const [viewMode,     setViewMode]     = useState<ViewMode>("date");

  useEffect(() => {
    fetch("/api/attendance/consequences")
      .then((r) => r.ok ? r.json() : [])
      .then((rows: AttendanceConsequence[]) => {
        const map: ConsequenceMap = {};
        for (const r of rows) map[`${r.event_type}:${r.status}`] = r.makeup_work;
        setConsequences(map);
      })
      .catch(() => {});
  }, []);

  const { from, to } = useMemo(() => {
    switch (preset) {
      case "season": return { from: seasonStart ?? null, to: today };
      case "30d":    return { from: daysAgo(30), to: today };
      case "14d":    return { from: daysAgo(14), to: today };
      case "7d":     return { from: daysAgo(7),  to: today };
      case "custom": return { from: customFrom,  to: customTo };
    }
  }, [preset, customFrom, customTo, seasonStart, today]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (activeTeam) params.set("team_id", activeTeam.id);
    if (from) params.set("from", from);
    if (to)   params.set("to", to);

    fetch(`/api/attendance/report?${params}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setReport(d); })
      .catch(() => setError("Failed to load attendance report"))
      .finally(() => setLoading(false));
  }, [activeTeam, from, to]);

  function recomputeTotals(records: Record<string, AttendanceRecord>) {
    let excused = 0, unexcused = 0, makeup_required = 0, makeup_done = 0;
    for (const r of Object.values(records)) {
      if (r.status === "excused") excused++; else unexcused++;
      if (r.makeup_required) { makeup_required++; if (r.makeup_completed_at) makeup_done++; }
    }
    return { excused, unexcused, makeup_required, makeup_done };
  }

  function handleUpdated(playerId: string, date: string, rec: AttendanceRecord) {
    setReport((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.map((p) =>
          p.player_id !== playerId ? p : {
            ...p,
            records: { ...p.records, [date]: rec },
            totals:  recomputeTotals({ ...p.records, [date]: rec }),
          }
        ),
      };
    });
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold tracking-tight">Attendance</h1>
        <p className="text-gray-400 text-sm mt-0.5 font-mono">
          {activeTeam?.name.toUpperCase() ?? "ALL TEAMS"} · ABSENCES &amp; MAKEUP TRACKING
        </p>
      </div>

      {/* Period selector */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 mb-4">
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                preset === p.id
                  ? "bg-coaches-red border-coaches-red text-white"
                  : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex items-center gap-3 flex-wrap mt-3">
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
              <CalendarDays size={13} className="text-gray-500" />
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-transparent text-white text-sm font-mono focus:outline-none" />
            </div>
            <span className="text-gray-500 text-sm">to</span>
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
              <CalendarDays size={13} className="text-gray-500" />
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="bg-transparent text-white text-sm font-mono focus:outline-none" />
            </div>
          </div>
        )}
      </div>

      {/* View toggle */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setViewMode("date")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            viewMode === "date"
              ? "bg-gray-700 border-gray-600 text-white"
              : "border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600"
          }`}
        >
          <CalendarDays size={15} /> By Date
        </button>
        <button
          type="button"
          onClick={() => setViewMode("athlete")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
            viewMode === "athlete"
              ? "bg-gray-700 border-gray-600 text-white"
              : "border-gray-700 text-gray-500 hover:text-gray-300 hover:border-gray-600"
          }`}
        >
          <Users size={15} /> By Athlete
        </button>
      </div>

      {/* Summary chips */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Excused",      val: report.players.reduce((s, p) => s + p.totals.excused, 0),         color: "text-emerald-400" },
            { label: "Unexcused",    val: report.players.reduce((s, p) => s + p.totals.unexcused, 0),       color: "text-red-400" },
            { label: "Makeup Req",   val: report.players.reduce((s, p) => s + p.totals.makeup_required, 0), color: "text-amber-400" },
            { label: "Makeup Done",  val: report.players.reduce((s, p) => s + p.totals.makeup_done, 0),     color: "text-sky-400" },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-3 text-center">
              <p className={`font-bold font-mono text-xl ${color}`}>{val}</p>
              <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="animate-spin text-gray-500" />
        </div>
      )}
      {!loading && error && (
        <div className="py-16 text-center text-red-400 font-mono text-xs">{error}</div>
      )}
      {!loading && !error && report && viewMode === "date" && (
        <ByDateView report={report} consequences={consequences} onUpdated={handleUpdated} />
      )}
      {!loading && !error && report && viewMode === "athlete" && (
        <ByAthleteView report={report} consequences={consequences} onUpdated={handleUpdated} />
      )}
    </DashboardLayout>
  );
}
