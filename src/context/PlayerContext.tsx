"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { Player, PlayerStatus, NewPlayerData } from "@/types/player";

export type { NewPlayerData }; // re-export so existing imports from this file still work

interface PlayerContextValue {
  players: Player[];
  /** True while an API call is in flight */
  loading: boolean;
  /** True when Supabase is reachable and responding */
  dbConnected: boolean;
  /** Non-null when the last fetch failed */
  dbError: string | null;
  addPlayer: (data: NewPlayerData) => Promise<void>;
  updatePlayer: (id: string, updates: Partial<Player>) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
  bulkImport: (rows: NewPlayerData[]) => Promise<{ added: number }>;
  refresh: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────

const PlayerContext = createContext<PlayerContextValue | null>(null);

// ── Helpers ───────────────────────────────────────────────────────────────

function sort(players: Player[]) {
  return [...players].sort((a, b) => a.jersey_number - b.jersey_number);
}

// ── Provider ──────────────────────────────────────────────────────────────

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbConnected, setDbConnected] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  // ── Fetch from Supabase via API route ──────────────────────────────────

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/players");
      const data = await res.json();

      if (!res.ok || data?.error) {
        setDbConnected(false);
        setDbError(data?.error ?? `Server error ${res.status}`);
        return;
      }

      setPlayers(sort(data));
      setDbConnected(true);
      setDbError(null);
    } catch (err) {
      setDbConnected(false);
      setDbError(err instanceof Error ? err.message : "Network error — could not reach the server");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── CRUD operations ────────────────────────────────────────────────────

  async function addPlayer(data: NewPlayerData) {
    const payload = { ...data, latest_vibe_score: 3.0 };

    setLoading(true);
    try {
      const res = await fetch("/api/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const player: Player = await res.json();
      if (!res.ok) throw new Error((player as { error?: string }).error ?? "Add failed");
      setPlayers((prev) => sort([...prev, player]));
    } finally {
      setLoading(false);
    }
  }

  async function updatePlayer(id: string, updates: Partial<Player>) {
    // Optimistic update — instant UI response
    setPlayers((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));

    try {
      const res = await fetch(`/api/players/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Update failed — changes reverted");
    } catch (err) {
      await refresh();
      throw err;
    }
  }

  async function deletePlayer(id: string) {
    // Optimistic removal
    setPlayers((prev) => prev.filter((p) => p.id !== id));

    try {
      const res = await fetch(`/api/players/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        await refresh();
        throw new Error("Delete failed — player restored");
      }
    } catch (err) {
      await refresh();
      throw err;
    }
  }

  async function bulkImport(rows: NewPlayerData[]) {
    setLoading(true);
    try {
      const res = await fetch("/api/players/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players: rows }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Bulk import failed");
      await refresh();
      return { added: result.added as number };
    } finally {
      setLoading(false);
    }
  }

  return (
    <PlayerContext.Provider
      value={{ players, loading, dbConnected, dbError, addPlayer, updatePlayer, deletePlayer, bulkImport, refresh }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayers(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayers must be used inside <PlayerProvider>");
  return ctx;
}
