"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CalendarDays, Users, CheckCircle2, XCircle,
  AlertCircle, Upload, Eye, ChevronLeft,
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

type ConsequenceMap = Record<string, string>; // key: "practice:excused" etc.

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

// ── Period presets ─────────────────────────────────────────────────────────

type Preset = "season" | "30d" | "14d" | "7d" | "custom";

const PRESETS: { id: Preset; label: string }[] = [
  { id: "season", label: "All Season" },
  { id: "30d",    label: "Last 30 Days" },
  { id: "14d",    label: "Last 14 Days" },
  { id: "7d",     label: "Last 7 Days" },
  { id: "custom", label: "Custom Range" },
];

// ── Status chip ────────────────────────────────────────────────────────────

function StatusChip({ rec }: { rec: AttendanceRecord | null }) {
  if (!rec) return <span className="text-gray-700 text-[10px] font-mono">—</span>;
  if (rec.status === "excused") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
        <CheckCircle2 size={9} /> EXC
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-mono">
      <XCircle size={9} /> UNE
    </span>
  );
}

// ── Inline review cell ────────────────────────────────────────────────────

function ReviewCell({
  date,
  rec,
  consequences,
  onUpdated,
}: {
  date:         string;
  rec:          AttendanceRecord | null;
  consequences: ConsequenceMap;
  onUpdated:    (date: string, rec: AttendanceRecord) => void;
}) {
  const [open,   setOpen]   = useState(false);
  const [status, setStatus] = useState<"excused" | "unexcused">(rec?.status ?? "unexcused");
  const [notes,  setNotes]  = useState(rec?.notes ?? "");
  const [saving, setSaving] = useState(false);

  if (!rec) return <StatusChip rec={null} />;

  const makeupWork = consequences[`${rec.event_type}:${status}`] ?? "";

  async function save() {
    setSaving(true);
    const res = await fetch("/api/attendance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rec!.id, status, notes }),
    });
    if (res.ok) {
      const updated = await res.json();
      onUpdated(date, updated);
      setOpen(false);
    }
    setSaving(false);
  }

  return (
    <div className="relative inline-block">
      <button type="button" onClick={() => setOpen((v) => !v)}>
        <StatusChip rec={{ ...rec, status }} />
      </button>

      {open && (
        <div className="absolute z-50 left-0 top-7 w-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-3 text-left">
          <p className="text-gray-400 text-[10px] font-mono uppercase tracking-wider mb-2">
            Review · {fmtDate(date)} · <span className="text-gray-600">{rec.event_type}</span>
          </p>
          <div className="flex gap-1 mb-2">
            {(["excused", "unexcused"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`flex-1 py-1 rounded text-[10px] font-semibold border transition-colors ${
                  status === s
                    ? s === "excused"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                      : "bg-red-500/20 border-red-500 text-red-400"
                    : "border-gray-700 text-gray-500 hover:border-gray-500"
                }`}
              >
                {s === "excused" ? "Excused" : "Unexcused"}
              </button>
            ))}
          </div>
          {makeupWork && (
            <div className="mb-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1.5">
              <p className="text-[9px] font-mono text-amber-500 uppercase tracking-wider mb-0.5">Makeup Work</p>
              <p className="text-amber-300 text-xs">{makeupWork}</p>
            </div>
          )}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Coach note (optional)"
            rows={2}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-xs px-2 py-1.5 resize-none focus:outline-none focus:border-gray-500 mb-2"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setOpen(false)}
              className="flex-1 py-1 rounded border border-gray-700 text-gray-400 text-xs hover:border-gray-500">
              Cancel
            </button>
            <button type="button" onClick={save} disabled={saving}
              className="flex-1 py-1 rounded bg-coaches-red text-white text-xs font-semibold disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Player detail drawer ───────────────────────────────────────────────────

function PlayerDrawer({
  row,
  consequences,
  onClose,
  onUpdated,
}: {
  row:          PlayerAttendanceRow;
  consequences: ConsequenceMap;
  onClose:      () => void;
  onUpdated:    (playerId: string, date: string, rec: AttendanceRecord) => void;
}) {
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [uploadErr,    setUploadErr]    = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <p className="text-white font-semibold">{row.full_name}</p>
            {row.jersey_number != null && (
              <p className="text-gray-500 text-xs font-mono">#{row.jersey_number}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-white">
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Totals strip */}
        <div className="grid grid-cols-4 gap-px bg-gray-700 border-b border-gray-700">
          {[
            { label: "Excused",    val: row.totals.excused,         color: "text-emerald-400" },
            { label: "Unexcused",  val: row.totals.unexcused,       color: "text-red-400" },
            { label: "Makeup Req", val: row.totals.makeup_required, color: "text-amber-400" },
            { label: "Completed",  val: row.totals.makeup_done,     color: "text-sky-400" },
          ].map((t) => (
            <div key={t.label} className="bg-gray-900 py-3 text-center">
              <p className={`text-lg font-bold font-mono ${t.color}`}>{t.val}</p>
              <p className="text-gray-600 text-[9px] font-mono uppercase tracking-wider">{t.label}</p>
            </div>
          ))}
        </div>

        {/* Absence list */}
        <div className="divide-y divide-gray-800">
          {Object.entries(row.records)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, rec]) => (
              <div key={date} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-white text-sm font-medium">{fmtDate(date)}</p>
                    <p className="text-gray-600 text-[10px] font-mono uppercase mt-0.5">{rec.event_type}</p>
                    {rec.notes && <p className="text-gray-500 text-xs mt-0.5">{rec.notes}</p>}
                    {(() => {
                      const work = consequences[`${rec.event_type}:${rec.status}`];
                      return work ? (
                        <div className="mt-1 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">
                          <p className="text-[9px] font-mono text-amber-500 uppercase tracking-wider">Makeup Work</p>
                          <p className="text-amber-300 text-xs">{work}</p>
                        </div>
                      ) : null;
                    })()}
                    <div className="flex items-center gap-1 mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                        <AlertCircle size={9} />
                        {rec.makeup_completed_at ? "Makeup done" : "Makeup required"}
                      </span>
                      {rec.makeup_proof_url && (
                        <a
                          href={`/api/attendance/proof?attendance_id=${rec.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] text-sky-400 hover:underline"
                        >
                          <Eye size={10} /> View proof
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <StatusChip rec={rec} />
                    {rec.reviewed_at && (
                      <span className="text-[9px] font-mono text-gray-600">
                        Reviewed {fmtDate(rec.reviewed_at.split("T")[0])}
                      </span>
                    )}
                  </div>
                </div>

                {/* Upload proof */}
                {rec.makeup_required && !rec.makeup_completed_at && (
                  <div className="mt-2">
                    {uploadErr && uploadingFor === date && (
                      <p className="text-red-400 text-[10px] mb-1">{uploadErr}</p>
                    )}
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-sky-400 hover:text-sky-300 transition-colors">
                      <Upload size={12} />
                      Upload proof
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingFor(date);
                          setUploadErr(null);
                          const fd = new FormData();
                          fd.append("attendance_id", rec.id);
                          fd.append("file", file);
                          const res = await fetch("/api/attendance/proof", { method: "POST", body: fd });
                          if (!res.ok) {
                            const j = await res.json().catch(() => ({}));
                            setUploadErr(j.error ?? "Upload failed");
                          } else {
                            const updated = await res.json();
                            onUpdated(row.player_id, date, {
                              ...rec,
                              makeup_proof_url:    updated.makeup_proof_url,
                              makeup_proof_name:   updated.makeup_proof_name,
                              makeup_completed_at: updated.makeup_completed_at,
                            });
                          }
                          setUploadingFor(null);
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ── Gradebook table ────────────────────────────────────────────────────────

function AttendanceGradebook({
  report,
  consequences,
  onUpdated,
}: {
  report:       AttendanceReport;
  consequences: ConsequenceMap;
  onUpdated:    (playerId: string, date: string, rec: AttendanceRecord) => void;
}) {
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerAttendanceRow | null>(null);
  const { dates, players } = report;

  if (players.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500 font-mono text-xs">
        NO ABSENCES FOR THIS PERIOD
      </div>
    );
  }

  const visibleDates = dates.slice(-10);

  return (
    <>
      {selectedPlayer && (
        <PlayerDrawer
          row={selectedPlayer}
          consequences={consequences}
          onClose={() => setSelectedPlayer(null)}
          onUpdated={(pid, date, rec) => {
            onUpdated(pid, date, rec);
            setSelectedPlayer((prev) =>
              prev?.player_id !== pid ? prev
                : { ...prev, records: { ...prev.records, [date]: rec } }
            );
          }}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left px-4 py-2.5 text-gray-500 font-mono text-[10px] uppercase tracking-wider w-40">Player</th>
              {visibleDates.map((d) => (
                <th key={d} className="px-2 py-2.5 text-gray-500 font-mono text-[10px] text-center min-w-[52px]">
                  {fmtDate(d)}
                </th>
              ))}
              <th className="px-4 py-2.5 text-gray-500 font-mono text-[10px] text-right uppercase tracking-wider">Total</th>
            </tr>
          </thead>
          <tbody>
            {players.map((row) => (
              <tr
                key={row.player_id}
                className="border-b border-gray-700/40 hover:bg-gray-700/20 transition-colors cursor-pointer"
                onClick={() => setSelectedPlayer(row)}
              >
                <td className="px-4 py-2.5">
                  <p className="text-white font-medium truncate">{row.full_name}</p>
                  {row.jersey_number != null && (
                    <p className="text-gray-600 font-mono text-[9px]">#{row.jersey_number}</p>
                  )}
                </td>
                {visibleDates.map((d) => (
                  <td key={d} className="px-2 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <ReviewCell
                      date={d}
                      rec={row.records[d] ?? null}
                      consequences={consequences}
                      onUpdated={(date, rec) => onUpdated(row.player_id, date, rec)}
                    />
                  </td>
                ))}
                <td className="px-4 py-2.5 text-right">
                  <span className={`font-mono font-bold text-xs ${row.totals.unexcused > 0 ? "text-red-400" : "text-gray-400"}`}>
                    {row.totals.excused + row.totals.unexcused}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
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
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 mb-6">
        <p className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-3">Time Period</p>
        <div className="flex gap-2 flex-wrap mb-3">
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
          <div className="flex items-center gap-3 flex-wrap mt-2">
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
        {from && <p className="text-[10px] font-mono text-gray-600 mt-2">{from} → {to}</p>}
      </div>

      {/* Summary chips */}
      {report && (
        <div className="flex gap-4 mb-6 flex-wrap">
          {[
            { label: "Excused",    val: report.players.reduce((s, p) => s + p.totals.excused, 0),         color: "text-emerald-400", icon: CheckCircle2 },
            { label: "Unexcused",  val: report.players.reduce((s, p) => s + p.totals.unexcused, 0),       color: "text-red-400",     icon: XCircle },
            { label: "Makeup Req", val: report.players.reduce((s, p) => s + p.totals.makeup_required, 0), color: "text-amber-400",   icon: AlertCircle },
            { label: "Completed",  val: report.players.reduce((s, p) => s + p.totals.makeup_done, 0),     color: "text-sky-400",     icon: Upload },
          ].map(({ label, val, color, icon: Icon }) => (
            <div key={label} className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3">
              <Icon size={16} className={color} />
              <div>
                <p className={`font-bold font-mono text-lg ${color}`}>{val}</p>
                <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        {loading  && <div className="py-16 text-center text-gray-500 font-mono text-xs">LOADING…</div>}
        {!loading && error  && <div className="py-16 text-center text-red-400 font-mono text-xs">{error}</div>}
        {!loading && !error && report && (
          <AttendanceGradebook report={report} consequences={consequences} onUpdated={handleUpdated} />
        )}
      </div>

      {report && (
        <p className="text-[10px] font-mono text-gray-600 mt-3">
          Tap a player row for full detail · Tap a status chip to review
        </p>
      )}
    </DashboardLayout>
  );
}
