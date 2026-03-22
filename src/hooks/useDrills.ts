"use client";

import { useState, useEffect } from "react";
import { Drill } from "@/types/drill";

export function useDrills() {
  const [drills, setDrills]   = useState<Drill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/drills")
      .then((r) => r.json())
      .then((data) => { if (!data.error) setDrills(data); })
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
