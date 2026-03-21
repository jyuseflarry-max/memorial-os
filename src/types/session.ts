import { Drill } from "@/types/drill";

export interface SessionDrill {
  /** Unique instance — a drill may appear more than once in a session */
  instanceId: string;
  drill: Drill;
  duration: number; // minutes
}

export interface Session {
  date: string;      // YYYY-MM-DD
  startTime: string; // HH:MM (24-hr clock)
  drills: SessionDrill[];
}

// ── Time helpers ──────────────────────────────────────────────────────────

/** "15:30" → 930 (minutes since midnight) */
export function parseTime(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** 930 → "3:30 PM" */
export function formatTime12(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Total session minutes */
export function totalDuration(drills: SessionDrill[]): number {
  return drills.reduce((s, d) => s + d.duration, 0);
}

/** Total projected shots across all drills */
export function totalShots(drills: SessionDrill[]): number {
  return drills.reduce((s, d) => s + d.drill.shot_density * d.duration, 0);
}
