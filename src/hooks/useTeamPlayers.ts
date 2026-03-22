"use client";

import { useMemo } from "react";
import { usePlayers } from "@/context/PlayerContext";
import { useTeam } from "@/context/TeamContext";

/**
 * Returns players filtered to the currently active team.
 * Drop-in replacement for usePlayers() wherever team-scoped data is needed.
 */
export function useTeamPlayers() {
  const ctx         = usePlayers();
  const { activeTeam } = useTeam();

  const players = useMemo(
    () => activeTeam ? ctx.players.filter((p) => p.team_id === activeTeam.id) : ctx.players,
    [ctx.players, activeTeam]
  );

  return { ...ctx, players };
}
