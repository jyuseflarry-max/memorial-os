"use client";

import { Activity } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useTeamPlayers } from "@/hooks/useTeamPlayers";
import { useTeam } from "@/context/TeamContext";
import { computeReadiness, PlayerStatus, getTrafficLight, TrafficLight } from "@/types/player";
import { useEffect, useState } from "react";

interface VibeCheckRow {
  player_id: string;
  sleep_hours: number;
  soreness: number;
  stress: number;
  mood_energy: number;
  vibe_score: number;
  submitted_at: string;
}

const LIGHT: Record<TrafficLight, { bar: string; badge: string; label: string }> = {
  green:  { bar: "bg-green-500",  badge: "text-green-400 bg-green-400/10 border-green-400/20",   label: "Ready"   },
  yellow: { bar: "bg-yellow-400", badge: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", label: "Monitor" },
  red:    { bar: "bg-red-500",    badge: "text-red-400 bg-red-400/10 border-red-400/20",           label: "At Risk" },
};

function timeAgo(iso: string): string {
  const diff  = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function ReadinessPage() {
  const { players, loading } = useTeamPlayers();
  const { activeTeam } = useTeam();
  const [checks, setChecks] = useState<Record<string, VibeCheckRow>>({});

  useEffect(() => {
    fetch("/api/vibe-checks")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setChecks(d); })
      .catch(() => {});
  }, []);

  const active = players
    .filter((p) => p.status === PlayerStatus.Active)
    .map((p) => ({ player: p, readiness: Math.round(computeReadiness(p) * 100), light: getTrafficLight(p) }))
    .sort((a, b) => a.player.jersey_number - b.player.jersey_number);

  const avg = active.length
    ? Math.round(active.reduce((s, r) => s + r.readiness, 0) / active.length)
    : 0;

  const counts = { green: 0, yellow: 0, red: 0 } as Record<TrafficLight, number>;
  active.forEach((r) => counts[r.light]++);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Team Readiness</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">
            {activeTeam?.name.toUpperCase() ?? "ALL TEAMS"} · {active.length} ACTIVE PLAYERS
          </p>
        </div>
        {/* Squad avg */}
        <div className="text-right">
          <p className="text-4xl font-black font-mono text-white">{loading ? "…" : `${avg}%`}</p>
          <p className="text-gray-500 text-xs font-mono">SQUAD AVG</p>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {(["green", "yellow", "red"] as TrafficLight[]).map((l) => (
          <div key={l} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${LIGHT[l].badge}`}>
            <span className={`w-2 h-2 rounded-full ${LIGHT[l].bar}`} />
            {counts[l]} {LIGHT[l].label}
          </div>
        ))}
      </div>

      {/* Player list */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        {loading && active.length === 0 && (
          <p className="text-gray-500 text-xs font-mono text-center py-12">LOADING…</p>
        )}
        {!loading && active.length === 0 && (
          <p className="text-gray-500 text-xs font-mono text-center py-12">NO ACTIVE PLAYERS</p>
        )}
        {active.map(({ player, readiness, light }, i) => {
          const check = checks[player.id] ?? null;
          return (
            <div
              key={player.id}
              className="flex items-center gap-4 px-5 py-4 border-b border-gray-700/50 last:border-0 hover:bg-gray-700/20 transition-colors"
            >
              {/* Rank */}
              <span className="text-gray-600 font-mono text-xs w-5 shrink-0 text-right">
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* Jersey */}
              <div className="w-9 h-9 rounded-xl bg-gray-700 flex items-center justify-center font-bold text-white text-sm font-mono shrink-0">
                {player.jersey_number}
              </div>

              {/* Name + position */}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{player.name}</p>
                <p className="text-gray-500 text-xs font-mono">{player.position}{player.class_year ? ` · ${player.class_year}` : ""}</p>
              </div>

              {/* Bar */}
              <div className="flex-1 max-w-[180px] hidden sm:block">
                <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div className={`h-full rounded-full ${LIGHT[light].bar}`} style={{ width: `${readiness}%` }} />
                </div>
              </div>

              {/* Score */}
              <span className="text-white font-bold font-mono text-sm w-10 text-right">{readiness}%</span>

              {/* Badge */}
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border hidden md:inline ${LIGHT[light].badge}`}>
                {LIGHT[light].label}
              </span>

              {/* Last check */}
              <span className="text-gray-600 text-[10px] font-mono w-14 text-right hidden lg:block">
                {check ? timeAgo(check.submitted_at) : "No check"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="flex items-center gap-2 mt-4 px-1">
        <Activity size={12} className="text-gray-600" />
        <p className="text-gray-600 text-xs font-mono">
          Readiness = (Vibe Score × 60%) + (1 − Load Norm × 40%) · Sorted lowest first
        </p>
      </div>
    </DashboardLayout>
  );
}
