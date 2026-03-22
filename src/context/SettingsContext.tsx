"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ProgramSettings, DEFAULT_SETTINGS } from "@/types/settings";

interface SettingsContextValue {
  settings: ProgramSettings;
  loading: boolean;
  save: (patch: Partial<ProgramSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  loading: true,
  save: async () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<ProgramSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setSettings(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = useCallback(async (patch: Partial<ProgramSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, save }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
