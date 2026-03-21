"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ExternalLink } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { MOCK_PLAYERS } from "@/lib/mock-players";
import {
  Player,
  PlayerStatus,
  TrafficLight,
  getTrafficLight,
  computeReadiness,
} from "@/types/player";

// ── Traffic Light dot ─────────────────────────────────────────────────────

const LIGHT_CONFIG: Record<
  TrafficLight,
  { dot: string; label: string; badge: string }
> = {
  green: {
    dot: "bg-green-400 shadow-green-400/60",
    label: "Ready",
    badge: "text-green-400 bg-green-400/10 border-green-400/20",
  },
  yellow: {
    dot: "bg-yellow-400 shadow-yellow-400/60",
    label: "Monitor",
    badge: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  },
  red: {
    dot: "bg-red-400 shadow-red-400/60",
    label: "At Risk",
    badge: "text-red-400 bg-red-400/10 border-red-400/20",
  },
};

function TrafficDot({ light }: { light: TrafficLight }) {
  const { dot } = LIGHT_CONFIG[light];
  return <span className={`w-3 h-3 rounded-full shrink-0 shadow-md ${dot}`} />;
}

// ── Status badge ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<PlayerStatus, string> = {
  [PlayerStatus.Active]: "text-gray-300 bg-gray-700 border-gray-600",
  [PlayerStatus.Out]: "text-red-400 bg-red-400/10 border-red-400/20",
  [PlayerStatus.Restricted]: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
};

function StatusBadge({ status }: { status: PlayerStatus }) {
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[status]}`}
    >
      {status}
    </span>
  );
}

// ── Readiness bar ─────────────────────────────────────────────────────────

function ReadinessBar({ player }: { player: Player }) {
  const r = computeReadiness(player);
  const pct = Math.round(r * 100);
  const color =
    r >= 0.65 ? "bg-green-400" : r >= 0.35 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-gray-400 w-8 text-right">{pct}%</span>
    </div>
  );
}

// ── Summary chips ─────────────────────────────────────────────────────────

function SummaryChips({ players }: { players: Player[] }) {
  const counts = players.reduce(
    (acc, p) => {
      acc[getTrafficLight(p)]++;
      return acc;
    },
    { green: 0, yellow: 0, red: 0 } as Record<TrafficLight, number>
  );

  return (
    <div className="flex gap-3 flex-wrap">
      {(["green", "yellow", "red"] as TrafficLight[]).map((light) => {
        const { label, badge } = LIGHT_CONFIG[light];
        return (
          <div
            key={light}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${badge}`}
          >
            <TrafficDot light={light} />
            {counts[light]} {label}
          </div>
        );
      })}
    </div>
  );
}

// ── Player card ───────────────────────────────────────────────────────────

function PlayerCard({ player }: { player: Player }) {
  const light = getTrafficLight(player);
  const { label, badge } = LIGHT_CONFIG[light];

  return (
    <div className="bg-gray-800 border border-gray-700 hover:border-gray-500 transition-colors rounded-2xl p-4 flex flex-col gap-3">
      {/* Row 1: identity + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Jersey bubble */}
          <div className="w-10 h-10 rounded-xl bg-gray-700 flex items-center justify-center font-bold text-white text-sm font-mono shrink-0">
            {player.jersey_number}
          </div>
          <div>
            <p className="text-white font-semibold leading-tight">{player.name}</p>
            <p className="text-gray-500 text-xs font-mono">{player.position}</p>
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

      {/* Row 2: metrics */}
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
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

const FILTER_OPTIONS = ["All", "green", "yellow", "red", PlayerStatus.Out, PlayerStatus.Restricted] as const;
type FilterOption = (typeof FILTER_OPTIONS)[number];

export default function PlayersPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterOption>("All");

  const filtered = useMemo(() => {
    return MOCK_PLAYERS.filter((p) => {
      const matchesQuery =
        !query ||
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.position.toLowerCase().includes(query.toLowerCase());
      const matchesFilter =
        filter === "All" ||
        (filter === "green" || filter === "yellow" || filter === "red"
          ? getTrafficLight(p) === filter
          : p.status === filter);
      return matchesQuery && matchesFilter;
    }).sort((a, b) => computeReadiness(a) - computeReadiness(b)); // worst first
  }, [query, filter]);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Player Bio-Stats</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">
            {MOCK_PLAYERS.length} ATHLETES · READINESS SNAPSHOT
          </p>
        </div>
        <Link
          href="/vibe-check"
          className="flex items-center gap-2 text-sm font-medium text-orange-400 border border-orange-400/30 bg-orange-400/5 hover:bg-orange-400/10 px-4 py-2 rounded-lg transition-colors"
        >
          <ExternalLink size={14} />
          Vibe Check Link
        </Link>
      </div>

      {/* Summary */}
      <div className="mb-5">
        <SummaryChips players={MOCK_PLAYERS} />
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search players…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                filter === f
                  ? "bg-orange-500 border-orange-500 text-white"
                  : "border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
              }`}
            >
              {f === "green" ? "🟢 Ready" : f === "yellow" ? "🟡 Monitor" : f === "red" ? "🔴 At Risk" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500 font-mono text-xs">
          NO PLAYERS MATCH FILTER
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <PlayerCard key={p.id} player={p} />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
