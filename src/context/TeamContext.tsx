"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Team } from "@/types/team";

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
  const [teams, setTeams]         = useState<Team[]>([]);
  const [activeTeam, setActiveTeamState] = useState<Team | null>(null);
  const [loading, setLoading]     = useState(true);

  async function refresh() {
    try {
      const res  = await fetch("/api/teams");
      const data = await res.json();
      if (!data.error && Array.isArray(data)) {
        setTeams(data);
        // Re-validate active team still exists
        setActiveTeamState((prev) => {
          const stored = prev?.id ?? (typeof window !== "undefined" ? localStorage.getItem("activeTeamId") : null);
          return data.find((t: Team) => t.id === stored) ?? data[0] ?? null;
        });
      }
    } catch {}
  }

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch("/api/teams");
        const data = await res.json();
        if (!data.error && Array.isArray(data)) {
          setTeams(data);
          const stored = typeof window !== "undefined" ? localStorage.getItem("activeTeamId") : null;
          const found  = data.find((t: Team) => t.id === stored) ?? data[0] ?? null;
          setActiveTeamState(found);
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  function setActiveTeam(team: Team) {
    setActiveTeamState(team);
    if (typeof window !== "undefined") localStorage.setItem("activeTeamId", team.id);
  }

  return (
    <TeamContext.Provider value={{ teams, activeTeam, setActiveTeam, loading, refresh }}>
      {children}
    </TeamContext.Provider>
  );
}
