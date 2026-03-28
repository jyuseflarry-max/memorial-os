"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Swords, MapPin, Clock } from "lucide-react";
import FamilyShell from "@/components/FamilyShell";
import { useAuth } from "@/context/AuthContext";
import { useLocations } from "@/context/LocationsContext";
import type { Game } from "@/types/game";
import { GAME_TYPE_LABELS } from "@/types/game";

// ── Helpers ─────────────────────────────────────────────────────────────────

function fmt12h(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  return `${h % 12 === 0 ? 12 : h % 12}:${mStr} ${h >= 12 ? "PM" : "AM"}`;
}

function subtractMins(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  let total = h * 60 + m - mins;
  if (total < 0) total += 24 * 60;
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  const suffix = hh >= 12 ? "PM" : "AM";
  return `${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${suffix}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "long" }),
    short:   d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    year:    d.getFullYear(),
  };
}

function isoToday() { return new Date().toISOString().split("T")[0]; }

// ── Page ────────────────────────────────────────────────────────────────────

export default function FamilyGamesPage() {
  const { authUser, isFamily, loading: authLoading } = useAuth();
  const { locations } = useLocations();
  const linkedPlayers = authUser?.linkedPlayers ?? [];

  const [selected, setSelected] = useState<string>("all");
  const [games, setGames]       = useState<Game[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const allTeamIds = useMemo(() => {
    const ids = new Set(linkedPlayers.map((p) => p.teamId).filter(Boolean) as string[]);
    return Array.from(ids);
  }, [linkedPlayers]);

  useEffect(() => {
    if (authLoading || !isFamily) return;
    if (allTeamIds.length === 0) { setDataLoading(false); return; }

    setDataLoading(true);
    Promise.all(
      allTeamIds.map((id) => fetch(`/api/games?team_id=${id}`).then((r) => r.json()))
    )
      .then((results) => {
        const all: Game[] = [];
        results.forEach((r) => { if (Array.isArray(r)) all.push(...r); });
        setGames(all);
      })
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, [authLoading, isFamily, allTeamIds]);

  const today = isoToday();

  const activeTeamIds = useMemo(() => {
    if (selected === "all") return allTeamIds;
    const p = linkedPlayers.find((lp) => lp.playerId === selected);
    return p?.teamId ? [p.teamId] : [];
  }, [selected, allTeamIds, linkedPlayers]);

  const visibleGames = useMemo(() =>
    games
      .filter((g) => g.game_date >= today && (activeTeamIds.length === 0 || activeTeamIds.includes(g.team_id ?? "")))
      .sort((a, b) => a.game_date.localeCompare(b.game_date)),
  [games, today, activeTeamIds]);

  if (authLoading) return null;

  return (
    <FamilyShell>
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Games</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">Upcoming game schedule</p>
        </div>

        {/* Player pills */}
        {linkedPlayers.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button type="button" onClick={() => setSelected("all")}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors font-mono ${
                selected === "all" ? "bg-purple-500/20 border-purple-500/40 text-purple-300" : "border-gray-700 text-gray-400 hover:text-white"
              }`}>
              All
            </button>
            {linkedPlayers.map((lp) => (
              <button key={lp.playerId} type="button" onClick={() => setSelected(lp.playerId)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors font-mono ${
                  selected === lp.playerId ? "bg-purple-500/20 border-purple-500/40 text-purple-300" : "border-gray-700 text-gray-400 hover:text-white"
                }`}>
                {lp.playerName.split(" ")[0]}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {dataLoading && <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-purple-400" /></div>}

        {/* Empty */}
        {!dataLoading && visibleGames.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Swords size={36} className="text-gray-700" />
            <p className="text-gray-500 text-sm font-mono">No upcoming games.</p>
          </div>
        )}

        {/* Game cards */}
        {!dataLoading && visibleGames.length > 0 && (
          <div className="flex flex-col gap-3">
            {visibleGames.map((g) => {
              const { weekday, short, year } = fmtDate(g.game_date);
              const isAway = g.location_type === "away" || g.location_type === "neutral";
              const timeStr = g.time_tbd ? "Time TBD" : g.game_time ? fmt12h(g.game_time) : "Time TBD";
              const venueUrl = g.venue ? `https://maps.google.com/maps?q=${encodeURIComponent(g.venue)}` : null;
              const locLabel = g.location_type === "home" ? "Home" : g.location_type === "away" ? "Away" : "Neutral";
              const matchedLoc = g.venue ? locations.find((l) => [l.name, l.address, l.city].filter(Boolean).join(", ") === g.venue) : null;
              const departureTime = isAway && g.game_time && !g.time_tbd && matchedLoc
                ? subtractMins(g.game_time, matchedLoc.default_travel_time + 90)
                : null;
              const arrivalTime = g.location_type === "home" && g.game_time && !g.time_tbd
                ? subtractMins(g.game_time, 90)
                : null;
              const currentYear = new Date().getFullYear();

              return (
                <div key={g.id} className={`bg-gray-900 border rounded-2xl p-4 flex flex-col gap-3 ${
                  g.game_date === today ? "border-purple-500/40" : "border-gray-700/60"
                }`}>
                  {/* Date row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold text-sm">{weekday}, {short}{year !== currentYear ? `, ${year}` : ""}</p>
                      {g.game_date === today && (
                        <span className="text-[9px] font-mono bg-purple-500 text-white px-1.5 py-0.5 rounded-full">TODAY</span>
                      )}
                    </div>
                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                      g.location_type === "home"
                        ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/25"
                        : g.location_type === "away"
                        ? "text-amber-400 bg-amber-400/10 border-amber-400/25"
                        : "text-sky-400 bg-sky-400/10 border-sky-400/25"
                    }`}>{locLabel}</span>
                  </div>

                  {/* Opponent + type */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-coaches-red/10 border border-coaches-red/25 flex items-center justify-center shrink-0">
                      <Swords size={16} className="text-coaches-red" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-base leading-tight">vs. {g.opponent}</p>
                      <p className="text-gray-500 text-xs font-mono mt-0.5">{GAME_TYPE_LABELS[g.game_type]}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-white text-sm font-mono font-semibold">{timeStr}</p>
                    </div>
                  </div>

                  {/* Venue / map link */}
                  {g.venue && venueUrl && (
                    <a href={venueUrl} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-coaches-blue hover:text-blue-300 text-xs font-mono transition-colors truncate">
                      <MapPin size={11} className="shrink-0" /> {g.venue}
                    </a>
                  )}

                  {/* Note */}
                  {g.game_note && (
                    <p className="text-purple-400 text-xs font-mono border-t border-gray-800 pt-2.5">{g.game_note}</p>
                  )}

                  {/* Departure time for away/neutral */}
                  {departureTime && (
                    <div className="flex items-center gap-2 bg-amber-400/5 border border-amber-400/15 rounded-xl px-3 py-2.5">
                      <Clock size={13} className="text-amber-400 shrink-0" />
                      <p className="text-amber-400 text-xs font-semibold">
                        Depart by {departureTime}
                      </p>
                    </div>
                  )}

                  {/* Arrival time for home */}
                  {arrivalTime && (
                    <div className="flex items-center gap-2 bg-emerald-400/5 border border-emerald-400/15 rounded-xl px-3 py-2.5">
                      <Clock size={13} className="text-emerald-400 shrink-0" />
                      <p className="text-emerald-400 text-xs font-semibold">
                        Be there by {arrivalTime}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FamilyShell>
  );
}
