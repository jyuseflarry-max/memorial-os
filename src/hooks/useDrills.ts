"use client";

import { useState, useEffect } from "react";
import { Drill } from "@/types/drill";
import { SYSTEM_DRILL_IDS } from "@/lib/quick-actions";

const SYSTEM_IDS = new Set(Object.values(SYSTEM_DRILL_IDS));

export function useDrills() {
  const [drills, setDrills]   = useState<Drill[]>([]);
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

  return { drills, loading, addToCache, updateInCache, removeFromCache };
}
