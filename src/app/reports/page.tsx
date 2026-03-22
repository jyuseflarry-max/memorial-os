"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronRight, BarChart3, Clock, CalendarDays } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useTeam } from "@/context/TeamContext";
import { useSettings } from "@/context/SettingsContext";
import type { PracticeTimeReport, CategoryRow } from "@/app/api/reports/practice-time/route";

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h === 0) return `${min}m`;
  if (min === 0) return `${h}h`;
  return `${h}h ${min}m`;
}

function isoToday(): string {
  return new Date().toISOString().split("T")[0];
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// ── Category bar colors (index-based) ────────────────────────────────────

const BAR_COLORS = [
  "bg-mustang-red",
  "bg-sky-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-purple-400",
  "bg-pink-400",
  "bg-orange-400",
  "bg-teal-400",
];

const BAR_COLORS_LIGHT = [
  "bg-mustang-red/30",
  "bg-sky-400/30",
  "bg-emerald-400/30",
  "bg-amber-400/30",
  "bg-purple-400/30",
  "bg-pink-400/30",
  "bg-orange-400/30",
  "bg-teal-400/30",
];

// ── Period presets ────────────────────────────────────────────────────────

type Preset = "season" | "30d" | "14d" | "7d" | "custom";

const PRESETS: { id: Preset; label: string }[] = [
  { id: "season", label: "All Season" },
  { id: "30d",    label: "Last 30 Days" },
  { id: "14d",    label: "Last 14 Days" },
  { id: "7d",     label: "Last 7 Days" },
  { id: "custom", label: "Custom Range" },
];

// ── Category row component ────────────────────────────────────────────────

function CategoryRowDisplay({
  row, colorIdx,
}: {
  row: CategoryRow; colorIdx: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const barPct   = row.percentage;  // bar width = actual % of total time
  const barColor = BAR_COLORS[colorIdx % BAR_COLORS.length];
  const subColor = BAR_COLORS_LIGHT[colorIdx % BAR_COLORS_LIGHT.length];

  return (
    <div className="border-b border-gray-700/50 last:border-0">
      {/* Category row */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-700/20 transition-colors text-left group"
      >
        {/* Expand icon */}
        <div className="text-gray-600 group-hover:text-gray-400 transition-colors shrink-0">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>

        {/* Category name */}
        <span className="text-white font-medium text-sm w-36 shrink-0">{row.category}</span>

        {/* Bar */}
        <div className="flex-1 bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${barPct}%` }}
          />
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 shrink-0 text-right">
          <span className="text-white font-bold font-mono text-sm w-16 text-right">
            {row.percentage}%
          </span>
          <span className="text-gray-400 font-mono text-sm w-16 text-right">
            {fmtMinutes(row.minutes)}
          </span>
          <span className="text-gray-600 font-mono text-xs w-20 text-right hidden md:block">
            {row.sessions} session{row.sessions !== 1 ? "s" : ""}
          </span>
        </div>
      </button>

      {/* Sub-category rows */}
      {expanded && (
        <div className="bg-gray-800/30 border-t border-gray-700/30">
          {row.sub_categories.map((sub) => {
            const subBarPct = sub.percentage; // bar width = % of total time, same scale as parent
            return (
              <div key={sub.sub_category} className="flex items-center gap-4 px-4 py-2.5 border-b border-gray-700/20 last:border-0">
                {/* Indent spacer */}
                <div className="w-3.5 shrink-0" />
                <span className="text-gray-400 text-xs w-36 shrink-0 font-mono">
                  {sub.sub_category === "(none)" ? "—" : sub.sub_category}
                </span>

                {/* Sub bar — relative to category total */}
                <div className="flex-1 bg-gray-700/50 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${subColor}`}
                    style={{ width: `${subBarPct}%` }}
                  />
                </div>

                <div className="flex items-center gap-6 shrink-0 text-right">
                  <span className="text-gray-300 font-mono text-xs w-16 text-right">
                    {sub.percentage}%
                    <span className="text-gray-600 text-[10px]"> overall</span>
                  </span>
                  <span className="text-gray-400 font-mono text-xs w-16 text-right">
                    {fmtMinutes(sub.minutes)}
                  </span>
                  <span className="text-gray-600 font-mono text-[10px] w-20 text-right hidden md:block">
                    {sub.sessions} session{sub.sessions !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { activeTeam } = useTeam();
  const { settings }   = useSettings();
  const today          = isoToday();

  const seasonStart = settings.season_start ?? undefined;

  const [preset,    setPreset]    = useState<Preset>("season");
  const [customFrom, setCustomFrom] = useState(seasonStart ?? daysAgo(30));
  const [customTo,   setCustomTo]   = useState(today);
  const [report,    setReport]    = useState<PracticeTimeReport | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // Derive from/to from preset
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

    fetch(`/api/reports/practice-time?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setReport(d);
      })
      .catch(() => setError("Failed to load report"))
      .finally(() => setLoading(false));
  }, [activeTeam, from, to]);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Practice Reports</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">
            {activeTeam?.name.toUpperCase() ?? "ALL TEAMS"} · TIME BY CATEGORY
          </p>
        </div>
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
                  ? "bg-mustang-red border-mustang-red text-white"
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
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-transparent text-white text-sm font-mono focus:outline-none"
              />
            </div>
            <span className="text-gray-500 text-sm">to</span>
            <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2">
              <CalendarDays size={13} className="text-gray-500" />
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-transparent text-white text-sm font-mono focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Period label */}
        {from && (
          <p className="text-[10px] font-mono text-gray-600 mt-2">
            {from} → {to}
          </p>
        )}
      </div>

      {/* Summary chips */}
      {report && (
        <div className="flex gap-4 mb-6 flex-wrap">
          <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3">
            <Clock size={16} className="text-mustang-red" />
            <div>
              <p className="text-white font-bold font-mono text-lg">{fmtMinutes(report.total_minutes)}</p>
              <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider">Total Practice Time</p>
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3">
            <BarChart3 size={16} className="text-mustang-red" />
            <div>
              <p className="text-white font-bold font-mono text-lg">{report.total_sessions}</p>
              <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider">Sessions</p>
            </div>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 flex items-center gap-3">
            <BarChart3 size={16} className="text-sky-400" />
            <div>
              <p className="text-white font-bold font-mono text-lg">{report.categories.length}</p>
              <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider">Categories</p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center gap-4 px-4 py-2.5 border-b border-gray-700 bg-gray-800/80">
          <div className="w-3.5 shrink-0" />
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider w-36 shrink-0">Category</span>
          <span className="flex-1 text-[10px] font-mono text-gray-500 uppercase tracking-wider">Distribution</span>
          <div className="flex items-center gap-6 shrink-0">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider w-16 text-right">%</span>
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider w-16 text-right">Time</span>
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider w-20 text-right hidden md:block">Sessions</span>
          </div>
        </div>

        {loading && (
          <div className="py-16 text-center text-gray-500 font-mono text-xs">LOADING…</div>
        )}
        {!loading && error && (
          <div className="py-16 text-center text-red-400 font-mono text-xs">{error}</div>
        )}
        {!loading && !error && report && report.categories.length === 0 && (
          <div className="py-16 text-center text-gray-500 font-mono text-xs">
            NO PRACTICE DATA FOR THIS PERIOD
          </div>
        )}
        {!loading && !error && report && report.categories.map((row, idx) => (
          <CategoryRowDisplay
            key={row.category}
            row={row}
            colorIdx={idx}
          />
        ))}
      </div>

      {report && report.categories.length > 0 && (
        <p className="text-[10px] font-mono text-gray-600 mt-3 text-right">
          Click a category row to expand sub-categories · All bars show % of total practice time
        </p>
      )}
    </DashboardLayout>
  );
}
