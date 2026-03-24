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

  useEffect(() => {
    const params = new URLSearchParams();
    if (seasonStart) params.set("season_start", seasonStart);
    const qs = params.size ? `?${params}` : "";

    fetch(`/api/vibe-checks${qs}`)
      .then((r) => r.json())
      .then((data) => { if (!data.error) setChecks(data); })
      .catch(() => {});

    fetch(`/api/vibe-checks/history${qs}`)
      .then((r) => r.json())
      .then((data) => { if (!data.error) setHistory(data); })
      .catch(() => {});
  }, [seasonStart]);

  return { checks, history };
}
