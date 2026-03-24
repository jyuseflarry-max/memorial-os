"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

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
  addCategory: (name: string, isRest?: boolean) => Promise<DrillCategoryRow | null>;
  removeCategory: (id: string) => Promise<void>;
  updateColor: (id: string, color: string) => Promise<void>;
}

const DrillCategoryContext = createContext<DrillCategoryCtx>({
  categories: [],
  loading: true,
  getCatColor: () => "#9ca3af",
  isRestCat: () => false,
  addCategory: async () => null,
  removeCategory: async () => {},
  updateColor: async () => {},
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

  function getCatColor(name: string): string {
    const cat = categories.find((c) => c.name === name);
    return cat?.color ?? "#9ca3af";
  }

  function isRestCat(name: string): boolean {
    const cat = categories.find((c) => c.name === name);
    return cat?.is_rest ?? false;
  }

  async function addCategory(name: string, isRest = false): Promise<DrillCategoryRow | null> {
    try {
      const res = await fetch("/api/drill-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, is_rest: isRest }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add category");
      setCategories((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      return data as DrillCategoryRow;
    } catch {
      return null;
    }
  }

  async function removeCategory(id: string): Promise<void> {
    try {
      const res = await fetch(`/api/drill-categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete category");
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // silently fail
    }
  }

  async function updateColor(id: string, color: string): Promise<void> {
    try {
      const res = await fetch(`/api/drill-categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color }),
      });
      if (!res.ok) throw new Error("Failed to update color");
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, color } : c))
      );
    } catch {
      // silently fail
    }
  }

  return (
    <DrillCategoryContext.Provider
      value={{ categories, loading, getCatColor, isRestCat, addCategory, removeCategory, updateColor }}
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
