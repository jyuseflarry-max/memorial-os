"use client";
import { useState, useEffect, useMemo } from "react";
import { Loader2, TrendingUp, TrendingDown, Minus, Clock, Zap } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { TrafficLightBadge, READINESS_LABELS } from "@/components/strength/TrafficLightBadge";
import { useTeam } from "@/context/TeamContext";
import type { PlayerStrengthCard } from "@/types/strength";

const CLASS_YEARS = ["Freshman", "Sophomore", "Junior", "Senior"];

export default function StrengthDashboardPage() {
  const [cards, setCards]     = useState<PlayerStrengthCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [teamFilter, setTeamFilter]   = useState<string>("all");
  const [classFilter, setClassFilter] = useState<string>("all");

  const { teams } = useTeam();

  useEffect(() => {
    fetch("/api/strength/dashboard")
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load dashboard");
        setCards(Array.isArray(d) ? d : []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => cards.filter(c => {
    if (teamFilter !== "all" && c.team_id !== teamFilter) return false;
    if (classFilter !== "all" && c.class_year !== classFilter) return false;
    return true;
  }), [cards, teamFilter, classFilter]);

  const counts = {
    green:  filtered.filter(c => c.traffic_light === "green").length,
    yellow: filtered.filter(c => c.traffic_light === "yellow").length,
    red:    filtered.filter(c => c.traffic_light === "red").length,
    gray:   filtered.filter(c => c.traffic_light === "gray").length,
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">S&C Dashboard</h1>
            <p className="text-gray-400 text-sm mt-0.5 font-mono">EXECUTIVE TRAFFIC LIGHT — ROSTER OVERVIEW</p>
          </div>
          {!loading && filtered.length > 0 && (
            <div className="flex items-center gap-3">
              {(["green", "yellow", "red", "gray"] as const).map(status => counts[status] > 0 && (
                <div key={status} className="flex items-center gap-1.5">
                  <TrafficLightBadge status={status} size="sm" />
                  <span className="text-sm font-semibold text-white">{counts[status]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filters */}
        {!loading && cards.length > 0 && (
          <div className="flex flex-wrap gap-4 mb-5">
            {/* Team filter */}
            {teams.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Team</span>
                <div className="flex gap-1 flex-wrap">
                  {["all", ...teams.map(t => t.id)].map(id => (
                    <button key={id} type="button" onClick={() => setTeamFilter(id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        teamFilter === id
                          ? "bg-coaches-blue text-white"
                          : "bg-gray-800 border border-gray-700 text-gray-400 hover:text-white"
                      }`}>
                      {id === "all" ? "All" : teams.find(t => t.id === id)?.name ?? id}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Class year filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Class</span>
              <div className="flex gap-1 flex-wrap">
                {["all", ...CLASS_YEARS].map(cy => (
                  <button key={cy} type="button" onClick={() => setClassFilter(cy)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      classFilter === cy
                        ? "bg-coaches-blue text-white"
                        : "bg-gray-800 border border-gray-700 text-gray-400 hover:text-white"
                    }`}>
                    {cy === "all" ? "All" : cy}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400 font-mono bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={28} className="animate-spin text-coaches-red" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 font-mono text-sm">
              {cards.length === 0 ? "No players found. Add players to your roster to begin tracking." : "No players match the selected filters."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(card => (
              <PlayerCard key={card.player_id} card={card} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function PlayerCard({ card }: { card: PlayerStrengthCard }) {
  const borderColor =
    card.traffic_light === "green"  ? "border-green-500/30"  :
    card.traffic_light === "yellow" ? "border-yellow-400/30" :
    card.traffic_light === "red"    ? "border-red-500/30"    : "border-gray-700";

  const bgColor =
    card.traffic_light === "green"  ? "bg-green-500/5"  :
    card.traffic_light === "yellow" ? "bg-yellow-400/5" :
    card.traffic_light === "red"    ? "bg-red-500/5"    : "bg-gray-800/40";

  return (
    <div className={`rounded-2xl border ${borderColor} ${bgColor} p-4 flex flex-col gap-3`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-white font-semibold text-sm leading-tight">{card.player_name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {card.jersey_number != null && (
              <span className="text-gray-500 text-[10px] font-mono">#{card.jersey_number}</span>
            )}
            {card.class_year && (
              <span className="text-gray-600 text-[10px] font-mono">{card.class_year}</span>
            )}
          </div>
        </div>
        <TrafficLightBadge status={card.traffic_light} showLabel size="sm" />
      </div>

      {/* Primary lift stat */}
      {card.best_1rm ? (
        <div>
          <p className="text-[10px] font-mono text-gray-500 uppercase">{card.best_lift_name ?? "Best Lift"}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-white font-bold text-lg">{card.best_1rm}</span>
            <span className="text-gray-400 text-xs">lbs</span>
            {card.lift_trend === "up"   && <TrendingUp  size={13} className="text-green-400 ml-auto" />}
            {card.lift_trend === "down" && <TrendingDown size={13} className="text-red-400 ml-auto" />}
            {card.lift_trend === "flat" && <Minus        size={13} className="text-yellow-400 ml-auto" />}
          </div>
          {card.best_swr != null && (
            <p className="text-[10px] font-mono text-gray-400">SWR: <span className="text-coaches-blue">{card.best_swr.toFixed(2)}</span></p>
          )}
        </div>
      ) : (
        <p className="text-[10px] font-mono text-gray-600">No lift data</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-700/40">
        <div className="flex items-center gap-1.5">
          <Zap size={11} className="text-gray-600" />
          {card.today_readiness ? (
            <>
              <TrafficLightBadge status={card.today_readiness} size="sm" />
              <span className="text-[10px] font-mono text-gray-400">{READINESS_LABELS[card.today_readiness]}</span>
            </>
          ) : (
            <span className="text-[10px] font-mono text-gray-600">No check-in</span>
          )}
        </div>
        {card.weeks_since_update != null && card.weeks_since_update >= 3 && (
          <div className="flex items-center gap-1 text-[9px] font-mono text-amber-500">
            <Clock size={9} />
            {card.weeks_since_update}w ago
          </div>
        )}
      </div>
    </div>
  );
}
