import { Drill } from "@/types/drill";
import { DrillGroup } from "@/types/grouping";

/** Summary row returned by GET /api/sessions/[date]/list */
export interface SessionSummary {
  id: string;
  label: string;       // "" = main practice
  start_time: string;
  drill_count: number;
}

export interface SessionDrill {
  /** Unique instance — a drill may appear more than once in a session */
  instanceId: string;
  drill: Drill;
  duration: number; // minutes
  /** Optional player groups assigned to this drill instance */
  groups?: DrillGroup[] | null;
}

// ── Split-Group Block ──────────────────────────────────────────────────────

export interface SubTrackDrill {
  instanceId: string;
  name: string;
  drillId?: string; // vault drill id, if sourced from vault
  duration: number; // minutes
}

export interface SubTrack {
  id: string;
  label: string;
  drills: SubTrackDrill[];
}

export interface SplitGroupBlock {
  instanceId: string;
  type: "split-group";
  title: string;
  masterDuration: number; // minutes — shared cap per sub-track
  subTracks: SubTrack[];
}

export type SessionItem = SessionDrill | SplitGroupBlock;

export function isSplitGroup(item: SessionItem): item is SplitGroupBlock {
  return (item as SplitGroupBlock).type === "split-group";
}

export interface Session {
  date: string;      // YYYY-MM-DD
  startTime: string; // HH:MM (24-hr clock)
  drills: SessionItem[];
}

// ── Time helpers ──────────────────────────────────────────────────────────

/** "15:30" → "3:30 PM" */
export function formatHHMM(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return hhmm;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

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
export function totalDuration(drills: SessionItem[]): number {
  return drills.reduce((s, d) => s + (isSplitGroup(d) ? d.masterDuration : d.duration), 0);
}

/** Projected shots for a single drill instance */
export function drillShots(sd: SessionDrill): number {
  return Math.round(sd.drill.shot_density * sd.duration);
}

/** Total projected shots across all drills (split-group blocks contribute 0) */
export function totalShots(drills: SessionItem[]): number {
  return drills.reduce((s, d) => s + (isSplitGroup(d) ? 0 : d.drill.shot_density * d.duration), 0);
}

/** A single drill entry returned by the AI planner */
export interface GeneratedDrill {
  drill_id: string;
  duration: number;
}

/** Persistence state of a session in the planner */
export type SaveStatus = "idle" | "saving" | "saved" | "unsaved";
