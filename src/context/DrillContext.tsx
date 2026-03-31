"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { Drill } from "@/types/drill";
import { SYSTEM_DRILL_IDS } from "@/lib/quick-actions";

const SYSTEM_IDS = new Set<string>(Object.values(SYSTEM_DRILL_IDS));

/** Binary-search insertion to maintain alphabetical order without a full re-sort. */
function sortedInsert(arr: Drill[], drill: Drill): Drill[] {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid].name.localeCompare(drill.name) < 0) lo = mid + 1;
    else hi = mid;
  }
  const next = arr.slice();
  next.splice(lo, 0, drill);
  return next;
}

interface DrillContextValue {
  drills: Drill[];
  loading: boolean;
  addDrill: (drill: Drill) => void;
  updateDrill: (drill: Drill) => void;
  removeDrill: (id: string) => void;
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

  function addDrill(drill: Drill) {
    setDrills((prev) => sortedInsert(prev, drill));
  }

  function updateDrill(drill: Drill) {
    setDrills((prev) => {
      const old = prev.find((d) => d.id === drill.id);
      // If the name didn't change, replace in-place — no re-sort needed
      if (old?.name === drill.name) return prev.map((d) => (d.id === drill.id ? drill : d));
      // Name changed: remove and re-insert at the correct sorted position
      return sortedInsert(prev.filter((d) => d.id !== drill.id), drill);
    });
  }

  function removeDrill(id: string) {
    setDrills((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <DrillContext.Provider value={{ drills, loading, addDrill, updateDrill, removeDrill }}>
      {children}
    </DrillContext.Provider>
  );
}

export function useDrills(): DrillContextValue {
  const ctx = useContext(DrillContext);
  if (!ctx) throw new Error("useDrills must be used inside <DrillProvider>");
  return ctx;
}
