"use client";

import { createContext, useContext, useEffect, useMemo, useCallback, useState, ReactNode } from "react";

export interface DrillCategoryRow {
  id: string;
  name: string;
  color: string; // hex e.g. "#60a5fa"
  is_rest: boolean;
}

interface DrillCategoryCtx {
  categories: DrillCategoryRow[];
  loading: boolean;
  getCatColor: (name: string) => string; // hex, fallback "#9ca3af"
  isRestCat: (name: string) => boolean;
  addCategory: (name: string, isRest?: boolean) => Promise<DrillCategoryRow>;
  removeCategory: (id: string) => Promise<void>;
  updateColor: (id: string, color: string) => Promise<void>;
  updateCategory: (id: string, updates: { name?: string; color?: string; is_rest?: boolean }) => Promise<DrillCategoryRow>;
}

const DrillCategoryContext = createContext<DrillCategoryCtx>({
  categories: [],
  loading: true,
  getCatColor: () => "#9ca3af",
  isRestCat: () => false,
  addCategory: async () => { throw new Error("not ready"); },
  removeCategory: async () => {},
  updateColor: async () => {},
  updateCategory: async () => { throw new Error("not ready"); },
});

export function DrillCategoryProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<DrillCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/drill-categories")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // O(1) lookup map — rebuilt only when categories array changes
  const categoryByName = useMemo(
    () => new Map(categories.map((c) => [c.name, c])),
    [categories]
  );

  const getCatColor = useCallback(
    (name: string) => categoryByName.get(name)?.color ?? "#9ca3af",
    [categoryByName]
  );

  const isRestCat = useCallback(
    (name: string) => categoryByName.get(name)?.is_rest ?? false,
    [categoryByName]
  );

  async function addCategory(name: string, isRest = false): Promise<DrillCategoryRow> {
    const res = await fetch("/api/drill-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, is_rest: isRest }),
    });
    let data: { error?: string } = {};
    try { data = await res.json(); } catch { /* non-JSON response */ }
    if (!res.ok) throw new Error(data.error ?? `Server error (${res.status})`);
    const row = data as unknown as DrillCategoryRow;
    setCategories((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
    return row;
  }

  async function removeCategory(id: string): Promise<void> {
    const res = await fetch(`/api/drill-categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? "Failed to delete category");
    }
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  async function updateColor(id: string, color: string): Promise<void> {
    await updateCategory(id, { color });
  }

  async function updateCategory(id: string, updates: { name?: string; color?: string; is_rest?: boolean }): Promise<DrillCategoryRow> {
    const res = await fetch(`/api/drill-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? "Failed to update category");
    }
    const row = await res.json() as DrillCategoryRow;
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? row : c))
    );
    return row;
  }

  return (
    <DrillCategoryContext.Provider
      value={{ categories, loading, getCatColor, isRestCat, addCategory, removeCategory, updateColor, updateCategory }}
    >
      {children}
    </DrillCategoryContext.Provider>
  );
}

export function useDrillCategories(): DrillCategoryCtx {
  return useContext(DrillCategoryContext);
}

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
