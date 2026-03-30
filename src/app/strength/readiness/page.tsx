"use client";
import { useState, useEffect, useMemo } from "react";
import { Loader2, Moon, Zap, Brain, Smile } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { TrafficLightBadge, READINESS_LABELS } from "@/components/strength/TrafficLightBadge";
import { useTeam } from "@/context/TeamContext";

const CLASS_YEARS = ["Freshman", "Sophomore", "Junior", "Senior"];

interface ReadinessRow {
  player_id:      string;
  player_name:    string;
  jersey_number:  number | null;
  team_id:        string | null;
  class_year:     string | null;
  status:         "green" | "yellow" | "red" | null;
  load_pct:       number | null;
  avg_load_pct:   number | null;
  sleep_hours:    number | null;
  soreness:       number | null;
  stress:         number | null;
  mood_energy:    number | null;
  submitted_at:   string | null;
  avg_sleep:      number | null;
  avg_soreness:   number | null;
  avg_stress:     number | null;
  avg_mood_energy: number | null;
  check_in_count: number;
}

// ── Metric bar with average tick ──────────────────────────────────────────

function MetricBar({
  icon: Icon,
  label,
  current,
  avg,
  min,
  max,
  goodHigh,
  format,
}: {
  icon: React.ElementType;
  label: string;
  current: number | null;
  avg: number | null;
  min: number;
  max: number;
  goodHigh: boolean;
  format: (n: number) => string;
}) {
  if (current === null) {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10px] font-mono text-gray-500 uppercase">
            <Icon size={9} />{label}
          </span>
          <span className="text-[10px] text-gray-600">—</span>
        </div>
        <div className="h-2 bg-gray-700/50 rounded-full" />
      </div>
    );
  }

  const range = max - min;
  const currentPct = Math.min(100, Math.max(0, ((current - min) / range) * 100));
  const avgPct     = avg !== null ? Math.min(100, Math.max(0, ((avg - min) / range) * 100)) : null;

  // Color based on direction and position
  const isGood = goodHigh ? current >= max * 0.6 : current <= min + range * 0.4;
  const isBad  = goodHigh ? current <= min + range * 0.3 : current >= max * 0.7;
  const barColor = isGood ? "bg-green-500" : isBad ? "bg-red-500" : "bg-yellow-400";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-[10px] font-mono text-gray-500 uppercase">
          <Icon size={9} />{label}
        </span>
        <div className="flex items-center gap-1.5">
          {avg !== null && (
            <span className="text-[9px] font-mono text-gray-600">avg {format(avg)}</span>
          )}
          <span className="text-[10px] font-mono font-semibold text-white">{format(current)}</span>
        </div>
      </div>

      {/* Bar */}
      <div className="relative h-2 bg-gray-700 rounded-full overflow-visible">
        {/* Current value fill */}
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${currentPct}%` }}
        />
        {/* Average tick mark */}
        {avgPct !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-[2px] h-3.5 bg-white/70 rounded-full"
            style={{ left: `${avgPct}%` }}
            title={`14-day avg: ${format(avg!)}`}
          />
        )}
      </div>
    </div>
  );
}

// ── Player card ───────────────────────────────────────────────────────────

function ReadinessCard({ row }: { row: ReadinessRow }) {
  const borderColor =
    row.status === "green"  ? "border-green-500/30"  :
    row.status === "yellow" ? "border-yellow-400/30" :
    row.status === "red"    ? "border-red-500/30"    : "border-gray-700";

  const bgColor =
    row.status === "green"  ? "bg-green-500/5"  :
    row.status === "yellow" ? "bg-yellow-400/5" :
    row.status === "red"    ? "bg-red-500/5"    : "bg-gray-800/40";

  const checkedIn = row.submitted_at
    ? new Date(row.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  return (
    <div className={`rounded-2xl border ${borderColor} ${bgColor} p-4 flex flex-col gap-3`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-white font-semibold text-sm leading-tight">{row.player_name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {row.jersey_number != null && <span className="text-gray-500 text-[10px] font-mono">#{row.jersey_number}</span>}
            {row.class_year && <span className="text-gray-600 text-[10px] font-mono">{row.class_year}</span>}
          </div>
        </div>
        {row.status ? (
          <TrafficLightBadge status={row.status} showLabel size="sm" />
        ) : (
          <span className="text-[10px] font-mono text-gray-600">No check-in</span>
        )}
      </div>

      {/* Load today vs avg */}
      {(row.load_pct !== null || row.avg_load_pct !== null) && (
        <div className="flex items-center gap-3 bg-gray-700/30 rounded-lg px-3 py-2">
          {row.load_pct !== null && (
            <div className="flex flex-col items-center flex-1">
              <span className={`text-lg font-bold font-mono ${row.load_pct === 100 ? "text-green-400" : row.load_pct === 90 ? "text-yellow-400" : "text-red-400"}`}>
                {row.load_pct}%
              </span>
              <span className="text-[9px] font-mono text-gray-500 uppercase">Today</span>
            </div>
          )}
          {row.load_pct !== null && row.avg_load_pct !== null && (
            <div className="w-px h-8 bg-gray-600" />
          )}
          {row.avg_load_pct !== null && (
            <div className="flex flex-col items-center flex-1">
              <span className="text-lg font-bold font-mono text-gray-300">{row.avg_load_pct}%</span>
              <span className="text-[9px] font-mono text-gray-500 uppercase">14-Day Avg</span>
            </div>
          )}
        </div>
      )}

      {/* Metric bars */}
      {row.status !== null && (
        <div className="flex flex-col gap-2.5">
          <MetricBar
            icon={Moon} label="Sleep"
            current={row.sleep_hours} avg={row.avg_sleep}
            min={3} max={12} goodHigh={true}
            format={n => `${n.toFixed(1)}h`}
          />
          <MetricBar
            icon={Zap} label="Soreness"
            current={row.soreness} avg={row.avg_soreness}
            min={1} max={5} goodHigh={false}
            format={n => `${n}/5`}
          />
          <MetricBar
            icon={Brain} label="Stress"
            current={row.stress} avg={row.avg_stress}
            min={1} max={5} goodHigh={false}
            format={n => `${n}/5`}
          />
          <MetricBar
            icon={Smile} label="Energy"
            current={row.mood_energy} avg={row.avg_mood_energy}
            min={1} max={5} goodHigh={true}
            format={n => `${n}/5`}
          />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-700/40">
        <span className="text-[9px] font-mono text-gray-600">
          {row.check_in_count > 0 ? `${row.check_in_count} check-ins / 14 days` : "No recent check-ins"}
        </span>
        {checkedIn && <span className="text-[9px] font-mono text-gray-600">{checkedIn}</span>}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

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
            <p className="text-gray-400 text-sm mt-0.5 font-mono">DAILY VIBE CHECK — 14-DAY WINDOW</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(row => <ReadinessCard key={row.player_id} row={row} />)}
          </div>
        )}

        {/* Legend */}
        {!loading && filtered.length > 0 && (
          <div className="mt-4 flex items-center gap-3 text-[10px] font-mono text-gray-600">
            <span>Bar = today's value</span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-[2px] h-3 bg-white/50 rounded-full" />
              = 14-day average
            </span>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
