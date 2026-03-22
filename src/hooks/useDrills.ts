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
    setDrills((prev) => [drill, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
  }

  return { drills, loading, addToCache };
}
