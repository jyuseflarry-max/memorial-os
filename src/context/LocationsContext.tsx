"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Location } from "@/types/location";

interface Ctx {
  locations: Location[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  addLocation: (loc: Location) => void;
  updateLocation: (loc: Location) => void;
  removeLocation: (id: string) => void;
}

const LocationsCtx = createContext<Ctx>({
  locations: [], loading: true, error: null,
  refresh: () => {}, addLocation: () => {}, updateLocation: () => {}, removeLocation: () => {},
});

export function LocationsProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/locations")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? `Server error (${r.status})`);
        setLocations(Array.isArray(d) ? d : []);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load locations");
        setLocations([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <LocationsCtx.Provider value={{
      locations, loading, error, refresh,
      addLocation:    (loc) => setLocations((p) => [...p, loc]),
      updateLocation: (loc) => setLocations((p) => p.map((l) => l.id === loc.id ? loc : l)),
      removeLocation: (id)  => setLocations((p) => p.filter((l) => l.id !== id)),
    }}>
      {children}
    </LocationsCtx.Provider>
  );
}

export function useLocations() { return useContext(LocationsCtx); }
