"use client";

import { useState, useEffect, useCallback } from "react";

export interface AbsenceRecord {
  id:        string;
  player_id: string;
  status:    "excused" | "unexcused";
  notes:     string | null;
}

export function useAttendance(date: string, teamId: string | null | undefined) {
  const [absences,  setAbsences]  = useState<AbsenceRecord[]>([]);
  const [loading,   setLoading]   = useState(false);

  const load = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ date });
      if (teamId) params.set("team_id", teamId);
      const res  = await fetch(`/api/attendance?${params}`);
      const data = await res.json();
      if (Array.isArray(data)) setAbsences(data);
    } catch {}
    setLoading(false);
  }, [date, teamId]);

  useEffect(() => { load(); }, [load]);

  /** Returns true if the player has an absence record */
  function isAbsent(playerId: string) {
    return absences.some((a) => a.player_id === playerId);
  }

  /** Returns the absence record for a player, or null */
  function getAbsence(playerId: string): AbsenceRecord | null {
    return absences.find((a) => a.player_id === playerId) ?? null;
  }

  /** Mark a player absent (or update their excuse status) */
  async function markAbsent(playerId: string, status: "excused" | "unexcused") {
    const params = new URLSearchParams({ date });
    if (teamId) params.set("team_id", teamId);

    const res = await fetch("/api/attendance", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        practice_date: date,
        player_id:     playerId,
        team_id:       teamId ?? null,
        status,
      }),
    });
    if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
    const record: AbsenceRecord = await res.json();
    setAbsences((prev) => {
      const filtered = prev.filter((a) => a.player_id !== playerId);
      return [...filtered, record];
    });
  }

  /** Mark a player present (remove absence record) */
  async function markPresent(playerId: string) {
    const params = new URLSearchParams({ date, player_id: playerId });
    if (teamId) params.set("team_id", teamId);
    const res = await fetch(`/api/attendance?${params}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Failed to mark present");
    }
    setAbsences((prev) => prev.filter((a) => a.player_id !== playerId));
  }

  return { absences, loading, isAbsent, getAbsence, markAbsent, markPresent, refresh: load };
}
