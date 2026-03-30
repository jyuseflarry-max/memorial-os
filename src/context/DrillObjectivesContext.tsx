"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { CATEGORY_PALETTE } from "@/lib/category-colors";
import { DRILL_OBJECTIVES } from "@/types/drill";

export interface DrillObjectiveRow {
  id: string;
  name: string;
  color: string;
}

interface DrillObjectivesCtx {
  objectives: DrillObjectiveRow[];
  loading: boolean;
  getObjColor: (name: string) => string;
  addObjective: (name: string) => Promise<DrillObjectiveRow>;
  updateObjective: (id: string, updates: { name?: string; color?: string }) => Promise<DrillObjectiveRow>;
  removeObjective: (id: string) => Promise<void>;
}

// Preset colors for the default objectives
const PRESET_COLORS: Record<string, string> = {
  "Active Recovery":  "#4ade80",
  "Ball Security":    "#facc15",
  "Conditioning":     "#fb923c",
  "Finishing":        "#f472b6",
  "Footwork":         "#38bdf8",
  "IQ/Read":          "#818cf8",
  "Precision":        "#2dd4bf",
  "Reaction Speed":   "#f87171",
  "Scheme (Defense)": "#60a5fa",
  "Scheme (Offense)": "#a3e635",
  "Transition":       "#fbbf24",
};

// Fallback list used when DB table doesn't exist yet
const FALLBACK: DrillObjectiveRow[] = DRILL_OBJECTIVES.map((name, i) => ({
  id: `__fallback_${i}`,
  name,
  color: PRESET_COLORS[name] ?? CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
}));

const Ctx = createContext<DrillObjectivesCtx>({
  objectives: FALLBACK,
  loading: false,
  getObjColor: (n) => PRESET_COLORS[n] ?? "#c084fc",
  addObjective: async () => { throw new Error("not ready"); },
  updateObjective: async () => { throw new Error("not ready"); },
  removeObjective: async () => {},
});

export function DrillObjectivesProvider({ children }: { children: ReactNode }) {
  const [objectives, setObjectives] = useState<DrillObjectiveRow[]>(FALLBACK);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/drill-objectives")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setObjectives(data);
        // else keep fallback
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function getObjColor(name: string): string {
    const obj = objectives.find((o) => o.name === name);
    return obj?.color ?? PRESET_COLORS[name] ?? "#c084fc";
  }

  async function addObjective(name: string): Promise<DrillObjectiveRow> {
    const res = await fetch("/api/drill-objectives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    let data: { error?: string } = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error((data as { error?: string }).error ?? `Server error (${res.status})`);
    const row = data as unknown as DrillObjectiveRow;
    setObjectives((prev) => {
      // Replace fallback entry if it exists, else append
      const without = prev.filter((o) => o.name !== name || !o.id.startsWith("__fallback_"));
      return [...without, row].sort((a, b) => a.name.localeCompare(b.name));
    });
    return row;
  }

  async function updateObjective(id: string, updates: { name?: string; color?: string }): Promise<DrillObjectiveRow> {
    const res = await fetch(`/api/drill-objectives/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    let data: { error?: string } = {};
    try { data = await res.json(); } catch {}
    if (!res.ok) throw new Error((data as { error?: string }).error ?? `Server error (${res.status})`);
    const row = data as unknown as DrillObjectiveRow;
    setObjectives((prev) => prev.map((o) => (o.id === id ? row : o)));
    return row;
  }

  async function removeObjective(id: string): Promise<void> {
    const res = await fetch(`/api/drill-objectives/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? "Failed to delete objective");
    }
    setObjectives((prev) => prev.filter((o) => o.id !== id));
  }

  return (
    <Ctx.Provider value={{ objectives, loading, getObjColor, addObjective, updateObjective, removeObjective }}>
      {children}
    </Ctx.Provider>
  );
}

export function useDrillObjectives() {
  return useContext(Ctx);
}
