"use client";
import { useState, useEffect, useMemo } from "react";
import { Loader2, Moon, Zap, Brain, Smile } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { TrafficLightBadge, READINESS_LABELS } from "@/components/strength/TrafficLightBadge";
import { readinessLoadFactor } from "@/lib/strength-utils";
import { useTeam } from "@/context/TeamContext";

const CLASS_YEARS = ["Freshman", "Sophomore", "Junior", "Senior"];

interface ReadinessRow {
  player_id:    string;
  player_name:  string;
  jersey_number: number | null;
  team_id:      string | null;
  class_year:   string | null;
  status:       "green" | "yellow" | "red" | null;
  sleep_hours:  number | null;
  soreness:     number | null;
  stress:       number | null;
  mood_energy:  number | null;
  vibe_score:   number | null;
  submitted_at: string | null;
}

export default function ReadinessPage() {
  const [rows, setRows]       = useState<ReadinessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [teamFilter, setTeamFilter]   = useState("all");
  const [classFilter, setClassFilter] = useState("all");

  const { teams } = useTeam();

  useEffect(() => {
    fetch("/api/strength/readiness")
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load");
        setRows(Array.isArray(d) ? d : []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => rows.filter(r => {
    if (teamFilter !== "all" && r.team_id !== teamFilter) return false;
    if (classFilter !== "all" && r.class_year !== classFilter) return false;
    return true;
  }), [rows, teamFilter, classFilter]);

  const counts = {
    green:  filtered.filter(r => r.status === "green").length,
    yellow: filtered.filter(r => r.status === "yellow").length,
    red:    filtered.filter(r => r.status === "red").length,
    none:   filtered.filter(r => r.status === null).length,
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Readiness</h1>
            <p className="text-gray-400 text-sm mt-0.5 font-mono">DAILY VIBE CHECK — ROSTER VIEW</p>
          </div>
          {!loading && filtered.length > 0 && (
            <div className="flex items-center gap-3">
              {(["green", "yellow", "red"] as const).map(s => counts[s] > 0 && (
                <div key={s} className="flex items-center gap-1.5">
                  <TrafficLightBadge status={s} size="sm" />
                  <span className="text-sm font-semibold text-white">{counts[s]}</span>
                </div>
              ))}
              {counts.none > 0 && (
                <span className="text-xs font-mono text-gray-500">{counts.none} no check-in</span>
              )}
            </div>
          )}
        </div>

        {/* Filters */}
        {!loading && rows.length > 0 && (
          <div className="flex flex-wrap gap-4 mb-5">
            {teams.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Team</span>
                <div className="flex gap-1 flex-wrap">
                  {["all", ...teams.map(t => t.id)].map(id => (
                    <button key={id} type="button" onClick={() => setTeamFilter(id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        teamFilter === id ? "bg-coaches-blue text-white" : "bg-gray-800 border border-gray-700 text-gray-400 hover:text-white"
                      }`}>
                      {id === "all" ? "All" : teams.find(t => t.id === id)?.name ?? id}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Class</span>
              <div className="flex gap-1 flex-wrap">
                {["all", ...CLASS_YEARS].map(cy => (
                  <button key={cy} type="button" onClick={() => setClassFilter(cy)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      classFilter === cy ? "bg-coaches-blue text-white" : "bg-gray-800 border border-gray-700 text-gray-400 hover:text-white"
                    }`}>
                    {cy === "all" ? "All" : cy}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400 font-mono bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-coaches-red" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 font-mono text-sm">
              {rows.length === 0 ? "No active players found." : "No players match the selected filters."}
            </p>
          </div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="px-4 py-3 text-left text-[10px] font-mono text-gray-500 uppercase">Player</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono text-gray-500 uppercase">
                    <span className="flex items-center gap-1"><Moon size={10} /> Sleep</span>
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono text-gray-500 uppercase">
                    <span className="flex items-center gap-1"><Zap size={10} /> Soreness</span>
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono text-gray-500 uppercase">
                    <span className="flex items-center gap-1"><Brain size={10} /> Stress</span>
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono text-gray-500 uppercase">
                    <span className="flex items-center gap-1"><Smile size={10} /> Energy</span>
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono text-gray-500 uppercase">Load</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono text-gray-500 uppercase">Checked In</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => {
                  const loadPct = row.status ? Math.round(readinessLoadFactor(row.status) * 100) : null;
                  const checkedIn = row.submitted_at
                    ? new Date(row.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : null;

                  return (
                    <tr key={row.player_id} className="border-b border-gray-700/40 last:border-0 hover:bg-gray-700/20">
                      <td className="px-4 py-3">
                        <p className="text-white text-sm font-medium">{row.player_name}</p>
                        <div className="flex items-center gap-1.5">
                          {row.jersey_number != null && <span className="text-gray-500 text-[10px] font-mono">#{row.jersey_number}</span>}
                          {row.class_year && <span className="text-gray-600 text-[10px] font-mono">{row.class_year}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {row.status ? (
                          <div className="flex items-center gap-2">
                            <TrafficLightBadge status={row.status} size="sm" />
                            <span className="text-xs text-gray-400">{READINESS_LABELS[row.status]}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-gray-600">No check-in</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.sleep_hours != null ? (
                          <span className={`text-sm font-mono font-semibold ${row.sleep_hours >= 7 ? "text-green-400" : row.sleep_hours >= 5 ? "text-yellow-400" : "text-red-400"}`}>
                            {row.sleep_hours.toFixed(1)}h
                          </span>
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {row.soreness != null ? (
                          <span className={`text-sm font-mono font-semibold ${row.soreness <= 2 ? "text-green-400" : row.soreness <= 3 ? "text-yellow-400" : "text-red-400"}`}>
                            {row.soreness}/5
                          </span>
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {row.stress != null ? (
                          <span className={`text-sm font-mono font-semibold ${row.stress <= 2 ? "text-green-400" : row.stress <= 3 ? "text-yellow-400" : "text-red-400"}`}>
                            {row.stress}/5
                          </span>
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {row.mood_energy != null ? (
                          <span className={`text-sm font-mono font-semibold ${row.mood_energy >= 4 ? "text-green-400" : row.mood_energy >= 3 ? "text-yellow-400" : "text-red-400"}`}>
                            {row.mood_energy}/5
                          </span>
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {loadPct != null ? (
                          <span className={`text-sm font-mono font-bold ${loadPct === 100 ? "text-green-400" : loadPct === 90 ? "text-yellow-400" : "text-red-400"}`}>
                            {loadPct}%
                          </span>
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-500 font-mono">{checkedIn ?? "—"}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
