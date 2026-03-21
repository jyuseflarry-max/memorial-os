"use client";

import { createContext, useContext, useState } from "react";
import { Player, PlayerStatus } from "@/types/player";
import { MOCK_PLAYERS } from "@/lib/mock-players";

// ── Types ─────────────────────────────────────────────────────────────────

export type NewPlayerData = {
  name: string;
  jersey_number: number;
  position: string;
  class_year: string;
  status: PlayerStatus;
  titan_load: number;
};

interface PlayerContextValue {
  players: Player[];
  addPlayer: (data: NewPlayerData) => void;
  updatePlayer: (id: string, updates: Partial<Player>) => void;
  deletePlayer: (id: string) => void;
}

// ── Context ───────────────────────────────────────────────────────────────

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [players, setPlayers] = useState<Player[]>(MOCK_PLAYERS);

  function addPlayer(data: NewPlayerData) {
    const player: Player = {
      ...data,
      id: crypto.randomUUID(),
      latest_vibe_score: 3.0,
    };
    setPlayers((prev) => [...prev, player].sort((a, b) => a.jersey_number - b.jersey_number));
  }

  function updatePlayer(id: string, updates: Partial<Player>) {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );
  }

  function deletePlayer(id: string) {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <PlayerContext.Provider value={{ players, addPlayer, updatePlayer, deletePlayer }}>
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayers(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayers must be used inside <PlayerProvider>");
  return ctx;
}
