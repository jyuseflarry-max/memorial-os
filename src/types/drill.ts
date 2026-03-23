// ── Drill Vault — Data Schema ─────────────────────────────────────────────
// Supabase-ready TypeScript interface.
// Column names use snake_case to match Postgres conventions.

export enum DrillCategory {
  Defense = "Defense",
  Offense = "Offense",
  Transition = "Transition",
  SpecialTeams = "Special Teams",
  /** Non-activity blocks: water breaks, transitions, etc. shot_density must be 0. */
  RestTransition = "Rest/Transition",
}

export enum ShotType {
  ThreePoint = "3pt",
  MidRange = "Mid-range",
  Finish = "Finish",
  FreeThrow = "Free Throw",
  None = "—",
}

export type IntensityLevel = 1 | 2 | 3 | 4 | 5;

export interface Drill {
  id: string;
  name: string;
  category: DrillCategory;
  sub_category: string;
  /** Average shots per player per minute at full pace */
  shot_density: number;
  /** Number of shot counter sessions used to build the shot_density average */
  shot_sessions?: number;
  shot_type: ShotType;
  /** 1 = recovery, 5 = all-out */
  intensity: IntensityLevel;
  video_url: string;
}
