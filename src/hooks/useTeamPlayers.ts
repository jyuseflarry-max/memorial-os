"use client";

import { usePlayers } from "@/context/PlayerContext";
import { useTeam } from "@/context/TeamContext";

/**
 * Returns players filtered to the currently active team.
 * Drop-in replacement for usePlayers() wherever team-scoped data is needed.
 */
export function useTeamPlayers() {
  const { players: allPlayers, ...rest } = usePlayers();
  const { activeTeam } = useTeam();

  // No useMemo — filtering 15-20 players is instant and context changes
  // need to propagate immediately on every render.
  const players = activeTeam
    ? allPlayers.filter((p) => p.team_id === activeTeam.id)
    : allPlayers;

  return { ...rest, players };
}
