"use client";

import { Activity } from "lucide-react";
import { usePlayers } from "@/context/PlayerContext";
import { computeReadiness, PlayerStatus } from "@/types/player";

export default function TeamReadinessCard() {
  const { players, loading, dbConnected } = usePlayers();

  // Only active players contribute to the readiness snapshot
  const active = players.filter((p) => p.status === PlayerStatus.Active);

  const rows = active
    .map((p) => ({
      name: p.name.split(" ").map((w, i) => (i === 0 ? w[0] + "." : w)).join(" "),
      readiness: Math.round(computeReadiness(p) * 100),
    }))
    .sort((a, b) => b.readiness - a.readiness);

  const avg = rows.length
    ? Math.round(rows.reduce((s, r) => s + r.readiness, 0) / rows.length)
    : 0;

  const barColor = (v: number) => {
    if (v >= 65) return "bg-green-500";
    if (v >= 35) return "bg-yellow-400";
    return "bg-mustang-red";
  };

  return (
    <section className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-mustang-red" />
          <h2 className="text-white font-semibold text-lg">
            Team Readiness&nbsp;
            <span className="text-gray-400 font-normal text-sm">— Vibe Check</span>
          </h2>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white font-mono">
            {loading && rows.length === 0 ? "…" : `${avg}%`}
          </p>
          <p className="text-gray-400 text-xs">Squad Avg</p>
        </div>
      </div>

      {/* States */}
      {loading && rows.length === 0 && (
        <p className="text-gray-500 text-xs font-mono text-center py-4">LOADING…</p>
      )}

      {!loading && !dbConnected && (
        <p className="text-red-400 text-xs font-mono text-center py-4">
          DATABASE OFFLINE — cannot load readiness data
        </p>
      )}

      {!loading && dbConnected && rows.length === 0 && (
        <p className="text-gray-500 text-xs font-mono text-center py-4">
          NO ACTIVE PLAYERS ON ROSTER
        </p>
      )}

      {/* Bar chart */}
      {rows.length > 0 && (
        <ul className="flex flex-col gap-3">
          {rows.map((p) => (
            <li key={p.name} className="flex items-center gap-3">
              <span className="text-gray-400 text-xs w-24 shrink-0 font-mono truncate">
                {p.name}
              </span>
              <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${barColor(p.readiness)}`}
                  style={{ width: `${p.readiness}%` }}
                />
              </div>
              <span className="text-gray-300 text-xs w-8 text-right font-mono">
                {p.readiness}%
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-gray-600 text-xs text-center font-mono border-t border-gray-700 pt-4">
        {active.length} ACTIVE PLAYERS · READINESS = VIBE 60% + LOAD 40%
      </p>
    </section>
  );
}
