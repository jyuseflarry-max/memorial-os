"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Facility } from "@/app/api/facilities/route";

interface Ctx {
  facilities: Facility[];
  loading:    boolean;
  error:      string | null;
  refresh:    () => void;
  addFacility:    (f: Facility) => void;
  updateFacility: (f: Facility) => void;
  removeFacility: (id: string) => void;
}

const FacilitiesCtx = createContext<Ctx>({
  facilities: [], loading: true, error: null,
  refresh: () => {}, addFacility: () => {}, updateFacility: () => {}, removeFacility: () => {},
});

export function FacilitiesProvider({ children }: { children: React.ReactNode }) {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/facilities")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? `Server error (${r.status})`);
        setFacilities(Array.isArray(d) ? d : []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load facilities");
        setFacilities([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <FacilitiesCtx.Provider value={{
      facilities, loading, error, refresh,
      addFacility:    (f) => setFacilities((p) => [...p, f]),
      updateFacility: (f) => setFacilities((p) => p.map((x) => x.id === f.id ? f : x)),
      removeFacility: (id) => setFacilities((p) => p.filter((x) => x.id !== id)),
    }}>
      {children}
    </FacilitiesCtx.Provider>
  );
}

export function useFacilities() { return useContext(FacilitiesCtx); }
