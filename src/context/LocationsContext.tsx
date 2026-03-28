"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { Location } from "@/types/location";

interface Ctx {
  locations: Location[];
  loading: boolean;
  refresh: () => void;
  addLocation: (loc: Location) => void;
  updateLocation: (loc: Location) => void;
  removeLocation: (id: string) => void;
}

const LocationsCtx = createContext<Ctx>({
  locations: [], loading: true,
  refresh: () => {}, addLocation: () => {}, updateLocation: () => {}, removeLocation: () => {},
});

export function LocationsProvider({ children }: { children: React.ReactNode }) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading]     = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    fetch("/api/locations")
      .then((r) => r.json())
      .then((d) => setLocations(Array.isArray(d) ? d : []))
      .catch(() => setLocations([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <LocationsCtx.Provider value={{
      locations, loading, refresh,
      addLocation:    (loc) => setLocations((p) => [...p, loc]),
      updateLocation: (loc) => setLocations((p) => p.map((l) => l.id === loc.id ? loc : l)),
      removeLocation: (id)  => setLocations((p) => p.filter((l) => l.id !== id)),
    }}>
      {children}
    </LocationsCtx.Provider>
  );
}

export function useLocations() { return useContext(LocationsCtx); }
