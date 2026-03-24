export interface VibeCheckRow {
  player_id: string;
  sleep_hours: number;
  soreness: number;
  stress: number;
  mood_energy: number;
  vibe_score: number;
  submitted_at: string;
}

export interface VibeAvgs {
  sleep_hours: number;
  soreness: number;
  stress: number;
  mood_energy: number;
}

/** Returns per-metric averages across a player's history, or null if fewer than 2 entries. */
export function computeAvgs(rows: VibeCheckRow[]): VibeAvgs | null {
  if (rows.length < 2) return null;
  const n = rows.length;
  return {
    sleep_hours: rows.reduce((s, r) => s + r.sleep_hours, 0) / n,
    soreness:    rows.reduce((s, r) => s + r.soreness,    0) / n,
    stress:      rows.reduce((s, r) => s + r.stress,      0) / n,
    mood_energy: rows.reduce((s, r) => s + r.mood_energy, 0) / n,
  };
}
