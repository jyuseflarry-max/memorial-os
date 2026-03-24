"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { Drill } from "@/types/drill";
import { SYSTEM_DRILL_IDS } from "@/lib/quick-actions";

const SYSTEM_IDS = new Set<string>(Object.values(SYSTEM_DRILL_IDS));

interface DrillContextValue {
  drills: Drill[];
  loading: boolean;
  addToCache: (drill: Drill) => void;
  updateInCache: (drill: Drill) => void;
  removeFromCache: (id: string) => void;
}

const DrillContext = createContext<DrillContextValue | null>(null);

export function DrillProvider({ children }: { children: React.ReactNode }) {
  const [drills,  setDrills]  = useState<Drill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/drills")
      .then((r) => r.json())
      .then((data) => { if (!data.error) setDrills(data.filter((d: Drill) => !SYSTEM_IDS.has(d.id))); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function addToCache(drill: Drill) {
    setDrills((prev) => [...prev, drill].sort((a, b) => a.name.localeCompare(b.name)));
  }

  function updateInCache(drill: Drill) {
    setDrills((prev) =>
      prev.map((d) => (d.id === drill.id ? drill : d)).sort((a, b) => a.name.localeCompare(b.name))
    );
  }

  function removeFromCache(id: string) {
    setDrills((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <DrillContext.Provider value={{ drills, loading, addToCache, updateInCache, removeFromCache }}>
      {children}
    </DrillContext.Provider>
  );
}

export function useDrills(): DrillContextValue {
  const ctx = useContext(DrillContext);
  if (!ctx) throw new Error("useDrills must be used inside <DrillProvider>");
  return ctx;
}
