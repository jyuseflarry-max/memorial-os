"use client";

import { useState, useEffect } from "react";
import { VibeCheckRow } from "@/types/vibe-check";

export type { VibeCheckRow };

/**
 * Fetches the latest vibe check per player and the full season history,
 * scoped to the given season_start date.
 */
export function useVibeChecks(seasonStart: string | null | undefined) {
  const [checks,  setChecks]  = useState<Record<string, VibeCheckRow>>({});
  const [history, setHistory] = useState<Record<string, VibeCheckRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (seasonStart) params.set("season_start", seasonStart);
    const qs = params.size ? `?${params}` : "";

    Promise.all([
      fetch(`/api/vibe-checks${qs}`).then((r) => r.json()),
      fetch(`/api/vibe-checks/history${qs}`).then((r) => r.json()),
    ])
      .then(([latest, hist]) => {
        if (!latest.error) setChecks(latest);
        if (!hist.error)   setHistory(hist);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load vibe checks");
      })
      .finally(() => setLoading(false));
  }, [seasonStart]);

  return { checks, history, loading, error };
}
