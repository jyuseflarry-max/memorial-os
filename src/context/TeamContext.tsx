"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Team } from "@/types/team";
import { useAuth } from "@/context/AuthContext";

interface TeamContextValue {
  teams: Team[];
  activeTeam: Team | null;
  setActiveTeam: (team: Team) => void;
  loading: boolean;
  refresh: () => Promise<void>;
}

const TeamContext = createContext<TeamContextValue>({
  teams: [],
  activeTeam: null,
  setActiveTeam: () => {},
  loading: true,
  refresh: async () => {},
});

export function useTeam() {
  return useContext(TeamContext);
}

export function TeamProvider({ children }: { children: ReactNode }) {
  const { authUser } = useAuth();
  const [teams, setTeams]                   = useState<Team[]>([]);
  const [activeTeam, setActiveTeamState]    = useState<Team | null>(null);
  const [loading, setLoading]               = useState(true);

  async function refresh() {
    try {
      const res  = await fetch("/api/teams");
      const data = await res.json();
      if (!data.error && Array.isArray(data)) {
        setTeams(data);
        setActiveTeamState((prev) => {
          // Players are always locked to their own team
          if (authUser?.role === "Player" && authUser.teamId) {
            return data.find((t: Team) => t.id === authUser.teamId) ?? data[0] ?? null;
          }
          const stored = prev?.id ?? (typeof window !== "undefined" ? localStorage.getItem("activeTeamId") : null);
          return data.find((t: Team) => t.id === stored) ?? data[0] ?? null;
        });
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { refresh(); }, [authUser?.teamId]);

  // When a player's teamId becomes known (auth loads after teams), re-lock
  useEffect(() => {
    if (authUser?.role === "Player" && authUser.teamId && teams.length > 0) {
      const playerTeam = teams.find((t) => t.id === authUser.teamId);
      if (playerTeam) setActiveTeamState(playerTeam);
    }
  }, [authUser?.teamId, teams]);

  function setActiveTeam(team: Team) {
    // Players cannot switch teams
    if (authUser?.role === "Player") return;
    setActiveTeamState(team);
    if (typeof window !== "undefined") localStorage.setItem("activeTeamId", team.id);
  }

  return (
    <TeamContext.Provider value={{ teams, activeTeam, setActiveTeam, loading, refresh }}>
      {children}
    </TeamContext.Provider>
  );
}
