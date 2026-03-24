// ── Athlete Readiness — Data Schema ──────────────────────────────────────
//
// Supabase SQL (run in dashboard → SQL Editor):
//
// CREATE TABLE players (
//   id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   name              TEXT        NOT NULL,
//   jersey_number     SMALLINT    NOT NULL UNIQUE,
//   position          TEXT        NOT NULL,
//   class_year        TEXT,
//   status            TEXT        NOT NULL DEFAULT 'Active',
//   titan_load        NUMERIC     NOT NULL DEFAULT 0,
//   latest_vibe_score NUMERIC(3,2),
//   updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );
//
// CREATE TABLE vibe_checks (
//   id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   player_id    UUID REFERENCES players(id) ON DELETE CASCADE,
//   sleep_hours  NUMERIC(4,1) NOT NULL,
//   soreness     SMALLINT NOT NULL CHECK (soreness BETWEEN 1 AND 5),
//   stress       SMALLINT NOT NULL CHECK (stress BETWEEN 1 AND 5),
//   mood_energy  SMALLINT NOT NULL CHECK (mood_energy BETWEEN 1 AND 5),
//   vibe_score   NUMERIC(3,2) NOT NULL,
//   submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
// );
// ─────────────────────────────────────────────────────────────────────────

export enum PlayerStatus {
  Active = "Active",
  Out = "Out",
  Restricted = "Restricted",
}

export type NewPlayerData = {
  name: string;
  jersey_number: number;
  position: string;
  class_year: string;
  status: PlayerStatus;
  titan_load: number;
  team_id?: string | null;
  email?: string | null;
};

export type VibeScale = 1 | 2 | 3 | 4 | 5;

export interface Player {
  id: string;
  name: string;
  jersey_number: number;
  position: string;
  class_year?: string;
  status: PlayerStatus;
  /** Hudl Titan load units — higher means more cumulative stress */
  titan_load: number;
  /** Composite 1-5 from latest Vibe Check survey */
  latest_vibe_score: number;
  /** FK to teams.id */
  team_id?: string | null;
  /** Contact email — used for login invites and notifications */
  email?: string | null;
  /** FK to users.id — set when the player has accepted their invite */
  user_id?: string | null;
}

export interface VibeCheckSubmission {
  player_id: string;
  sleep_hours: number;
  soreness: VibeScale;
  stress: VibeScale;
  mood_energy: VibeScale;
}

// ── Readiness scoring ─────────────────────────────────────────────────────

export type TrafficLight = "green" | "yellow" | "red";

/** Returns a 0–1 readiness score blending vibe (60%) and titan load (40%) */
export function computeReadiness(player: Player): number {
  const vibeNorm = (player.latest_vibe_score - 1) / 4; // 0–1
  const loadNorm = Math.min(player.titan_load / 1000, 1); // 0–1, higher = more fatigued
  return vibeNorm * 0.6 + (1 - loadNorm) * 0.4;
}

export function getTrafficLight(player: Player): TrafficLight {
  if (player.status === PlayerStatus.Out) return "red";
  if (player.status === PlayerStatus.Restricted) return "yellow";
  const r = computeReadiness(player);
  if (r >= 0.65) return "green";
  if (r >= 0.35) return "yellow";
  return "red";
}

/** Display config for each traffic light — labels and Tailwind color classes */
export const TRAFFIC_LIGHT_CONFIG: Record<TrafficLight, { dot: string; label: string; badge: string }> = {
  green:  { dot: "bg-green-400 shadow-green-400/60",   label: "Ready",   badge: "text-green-400 bg-green-400/10 border-green-400/20" },
  yellow: { dot: "bg-yellow-400 shadow-yellow-400/60", label: "Monitor", badge: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  red:    { dot: "bg-red-400 shadow-red-400/60",        label: "At Risk", badge: "text-red-400 bg-red-400/10 border-red-400/20" },
};

/** Convert 4 raw survey inputs into a composite 1-5 vibe score */
export function computeVibeScore(
  sleepHours: number,
  soreness: VibeScale,
  stress: VibeScale,
  moodEnergy: VibeScale
): number {
  const sleepScore =
    sleepHours >= 8.5 ? 5 : sleepHours >= 7 ? 4 : sleepHours >= 6 ? 3 : sleepHours >= 5 ? 2 : 1;
  const avg = (sleepScore + (6 - soreness) + (6 - stress) + moodEnergy) / 4;
  return Math.round(avg * 10) / 10;
}
