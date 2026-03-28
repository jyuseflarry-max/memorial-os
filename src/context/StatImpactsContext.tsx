"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { StatImpact } from "@/types/stat-impact";

// Default stat impacts (used as fallback if DB table not yet created)
export const DEFAULT_STAT_IMPACTS: Omit<StatImpact, "id" | "created_at" | "tenant_id">[] = [
  { name: "Effective FG%",      color: "#22c55e" },
  { name: "Turnover Rate",      color: "#ef4444" },
  { name: "Rebounding %",       color: "#f97316" },
  { name: "Defensive Stops",    color: "#3b82f6" },
  { name: "Free Throw %",       color: "#a855f7" },
  { name: "Transition Points",  color: "#eab308" },
];

interface Ctx {
  statImpacts: StatImpact[];
  loading: boolean;
  refresh: () => void;
  addStatImpact: (s: StatImpact) => void;
  updateStatImpact: (s: StatImpact) => void;
  removeStatImpact: (id: string) => void;
}

const StatImpactsCtx = createContext<Ctx>({
  statImpacts: [], loading: true,
  refresh: () => {}, addStatImpact: () => {}, updateStatImpact: () => {}, removeStatImpact: () => {},
});

export function StatImpactsProvider({ children }: { children: React.ReactNode }) {
  const [statImpacts, setStatImpacts] = useState<StatImpact[]>([]);
  const [loading, setLoading]         = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    fetch("/api/stat-impacts")
      .then((r) => r.json())
      .then((d: StatImpact[]) => {
        if (!Array.isArray(d) || d.length === 0) {
          // Fallback: use defaults with synthetic IDs
          setStatImpacts(DEFAULT_STAT_IMPACTS.map((s, i) => ({
            ...s, id: `default-${i}`, created_at: "", tenant_id: null,
          })));
        } else {
          setStatImpacts(d);
        }
      })
      .catch(() => setStatImpacts([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <StatImpactsCtx.Provider value={{
      statImpacts, loading, refresh,
      addStatImpact:    (s) => setStatImpacts((p) => [...p, s]),
      updateStatImpact: (s) => setStatImpacts((p) => p.map((x) => x.id === s.id ? s : x)),
      removeStatImpact: (id)  => setStatImpacts((p) => p.filter((x) => x.id !== id)),
    }}>
      {children}
    </StatImpactsCtx.Provider>
  );
}

export function useStatImpacts() { return useContext(StatImpactsCtx); }
