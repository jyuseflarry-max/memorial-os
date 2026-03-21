"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Search, ExternalLink, Moon, Activity, Brain, Zap, Clock } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { usePlayers } from "@/context/PlayerContext";
import {
  Player,
  PlayerStatus,
  TrafficLight,
  getTrafficLight,
  computeReadiness,
} from "@/types/player";

// ── Vibe check row type ───────────────────────────────────────────────────

interface VibeCheckRow {
  player_id: string;
  sleep_hours: number;
  soreness: number;
  stress: number;
  mood_energy: number;
  vibe_score: number;
  submitted_at: string;
}

// ── Traffic light config ──────────────────────────────────────────────────

const LIGHT_CONFIG: Record<TrafficLight, { dot: string; label: string; badge: string }> = {
  green:  { dot: "bg-green-400 shadow-green-400/60",   label: "Ready",   badge: "text-green-400 bg-green-400/10 border-green-400/20" },
  yellow: { dot: "bg-yellow-400 shadow-yellow-400/60", label: "Monitor", badge: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  red:    { dot: "bg-red-400 shadow-red-400/60",        label: "At Risk", badge: "text-red-400 bg-red-400/10 border-red-400/20" },
};

function TrafficDot({ light }: { light: TrafficLight }) {
  return <span className={`w-3 h-3 rounded-full shrink-0 shadow-md ${LIGHT_CONFIG[light].dot}`} />;
}

// ── Status badge ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<PlayerStatus, string> = {
  [PlayerStatus.Active]:     "text-gray-300 bg-gray-700 border-gray-600",
  [PlayerStatus.Out]:        "text-red-400 bg-red-400/10 border-red-400/20",
  [PlayerStatus.Restricted]: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
};

function StatusBadge({ status }: { status: PlayerStatus }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[status]}`}>
      {status}
    </span>
  );
}

// ── Readiness bar ─────────────────────────────────────────────────────────

function ReadinessBar({ player }: { player: Player }) {
  const r   = computeReadiness(player);
  const pct = Math.round(r * 100);
  const color = r >= 0.65 ? "bg-green-400" : r >= 0.35 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono text-gray-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

// ── Survey metric mini-bar ────────────────────────────────────────────────

function MetricBar({
  icon: Icon,
  label,
  value,
  max = 5,
  color,
  invert = false,
  avg,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  max?: number;
  color: string;
  invert?: boolean;
  avg?: number;
}) {
  // For soreness/stress, higher = worse, so we invert visually
  const displayValue = invert ? max + 1 - value : value;
  const pct = (displayValue / max) * 100;
  const avgPct = avg !== undefined ? ((invert ? max + 1 - avg : avg) / max) * 100 : null;

  return (
    <div className="flex items-center gap-2">
      <Icon size={11} className={`shrink-0 ${color}`} />
      <span className="text-[10px] font-mono text-gray-500 w-14 shrink-0">{label}</span>
      {/* Track with avg marker — needs position:relative and overflow:visible so marker can poke out */}
      <div className="flex-1 relative" style={{ height: "12px" }}>
        {/* Background track */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-gray-700 rounded-full h-1 overflow-hidden">
          <div className={`h-full rounded-full ${color.replace("text-", "bg-")}`} style={{ width: `${pct}%` }} />
        </div>
        {/* Average marker — white tick taller than the bar */}
        {avgPct !== null && (
          <div
            className="absolute top-0 bottom-0 w-px bg-white/70 rounded-full"
            style={{ left: `calc(${avgPct}% - 0.5px)` }}
            title={`Avg: ${avg?.toFixed(1)}`}
          />
        )}
      </div>
      <span className="text-[10px] font-mono text-gray-400 w-5 text-right">{value}</span>
    </div>
  );
}

// ── Time-ago helper ───────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ── Summary chips ─────────────────────────────────────────────────────────

function SummaryChips({ players }: { players: Player[] }) {
  const counts = players.reduce(
    (acc, p) => { acc[getTrafficLight(p)]++; return acc; },
    { green: 0, yellow: 0, red: 0 } as Record<TrafficLight, number>
  );
  return (
    <div className="flex gap-3 flex-wrap">
      {(["green", "yellow", "red"] as TrafficLight[]).map((light) => {
        const { label, badge } = LIGHT_CONFIG[light];
        return (
          <div key={light} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${badge}`}>
            <TrafficDot light={light} />
            {counts[light]} {label}
          </div>
        );
      })}
    </div>
  );
}

// ── Average helper ────────────────────────────────────────────────────────

interface VibeAvgs {
  sleep_hours: number;
  soreness: number;
  stress: number;
  mood_energy: number;
}

function computeAvgs(rows: VibeCheckRow[]): VibeAvgs | null {
  if (rows.length < 2) return null; // need at least 2 entries to show an avg line
  const n = rows.length;
  return {
    sleep_hours: rows.reduce((s, r) => s + r.sleep_hours, 0) / n,
    soreness:    rows.reduce((s, r) => s + r.soreness,    0) / n,
    stress:      rows.reduce((s, r) => s + r.stress,      0) / n,
    mood_energy: rows.reduce((s, r) => s + r.mood_energy, 0) / n,
  };
}

// ── Player card ───────────────────────────────────────────────────────────

function PlayerCard({ player, check, history }: { player: Player; check: VibeCheckRow | null; history: VibeCheckRow[] }) {
  const avgs = computeAvgs(history);
  const light = getTrafficLight(player);
  const { label, badge } = LIGHT_CONFIG[light];

  return (
    <div className="bg-gray-800 border border-gray-700 hover:border-gray-500 transition-colors rounded-2xl p-4 flex flex-col gap-3">
      {/* Row 1: identity + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-700 flex items-center justify-center font-bold text-white text-sm font-mono shrink-0">
            {player.jersey_number}
          </div>
          <div>
            <p className="text-white font-semibold leading-tight">{player.name}</p>
            <p className="text-gray-500 text-xs font-mono">{player.position}{player.class_year ? ` · ${player.class_year}` : ""}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={player.status} />
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${badge}`}>
            <TrafficDot light={light} />
            {label}
          </span>
        </div>
      </div>

      {/* Row 2: vibe + load */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-700/40 rounded-xl px-3 py-2">
          <p className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-0.5">Vibe Score</p>
          <p className="text-white font-bold font-mono text-lg">
            {player.latest_vibe_score.toFixed(1)}
            <span className="text-gray-500 text-xs font-normal"> / 5</span>
          </p>
        </div>
        <div className="bg-gray-700/40 rounded-xl px-3 py-2">
          <p className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-0.5">Titan Load</p>
          <p className="text-white font-bold font-mono text-lg">
            {player.titan_load}
            <span className="text-gray-500 text-xs font-normal"> AU</span>
          </p>
        </div>
      </div>

      {/* Row 3: readiness bar */}
      <div>
        <p className="text-xs font-mono text-gray-500 mb-1.5 uppercase tracking-wider">Readiness</p>
        <ReadinessBar player={player} />
      </div>

      {/* Row 4: latest vibe check breakdown */}
      {check ? (
        <div className="border-t border-gray-700 pt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Latest Vibe Check</p>
            <span className="flex items-center gap-1 text-[10px] font-mono text-gray-600">
              <Clock size={9} />
              {timeAgo(check.submitted_at)}
            </span>
          </div>
          <MetricBar icon={Moon}     label="Sleep"    value={check.sleep_hours} max={10} color="text-blue-400"   avg={avgs?.sleep_hours} />
          <MetricBar icon={Activity} label="Soreness" value={check.soreness}               color="text-yellow-400" invert avg={avgs?.soreness} />
          <MetricBar icon={Brain}    label="Stress"   value={check.stress}                 color="text-purple-400" invert avg={avgs?.stress} />
          <MetricBar icon={Zap}      label="Energy"   value={check.mood_energy}             color="text-green-400" avg={avgs?.mood_energy} />
        </div>
      ) : (
        <div className="border-t border-gray-700 pt-3">
          <p className="text-[10px] font-mono text-gray-600 uppercase tracking-wider text-center">
            No vibe check submitted
          </p>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

const FILTER_OPTIONS = ["All", "green", "yellow", "red", PlayerStatus.Out, PlayerStatus.Restricted] as const;
type FilterOption = (typeof FILTER_OPTIONS)[number];

export default function PlayersPage() {
  const { players } = usePlayers();
  const [query,   setQuery]   = useState("");
  const [filter,  setFilter]  = useState<FilterOption>("All");
  const [checks,  setChecks]  = useState<Record<string, VibeCheckRow>>({});
  const [history, setHistory] = useState<Record<string, VibeCheckRow[]>>({});

  useEffect(() => {
    fetch("/api/vibe-checks")
      .then((r) => r.json())
      .then((data) => { if (!data.error) setChecks(data); })
      .catch(() => {});
    fetch("/api/vibe-checks/history")
      .then((r) => r.json())
      .then((data) => { if (!data.error) setHistory(data); })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return players
      .filter((p) => {
        const matchesQuery  = !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.position.toLowerCase().includes(query.toLowerCase());
        const matchesFilter = filter === "All" || (["green","yellow","red"].includes(filter) ? getTrafficLight(p) === filter : p.status === filter);
        return matchesQuery && matchesFilter;
      })
      .sort((a, b) => computeReadiness(a) - computeReadiness(b));
  }, [query, filter, players]);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Player Bio-Stats</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">
            {players.length} ATHLETES · READINESS SNAPSHOT
          </p>
        </div>
        <Link
          href="/vibe-check"
          className="flex items-center gap-2 text-sm font-medium text-mustang-red border border-mustang-red/30 bg-mustang-red/5 hover:bg-mustang-red/10 px-4 py-2 rounded-lg transition-colors"
        >
          <ExternalLink size={14} />
          Vibe Check Link
        </Link>
      </div>

      {/* Summary */}
      <div className="mb-5">
        <SummaryChips players={players} />
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search players…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-mustang-red transition-colors"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filter === f
                  ? "bg-mustang-red border-mustang-red text-white"
                  : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
              }`}
            >
              {f === "green" ? "🟢 Ready" : f === "yellow" ? "🟡 Monitor" : f === "red" ? "🔴 At Risk" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500 font-mono text-xs">
          NO PLAYERS MATCH FILTER
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <PlayerCard key={p.id} player={p} check={checks[p.id] ?? null} history={history[p.id] ?? []} />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
