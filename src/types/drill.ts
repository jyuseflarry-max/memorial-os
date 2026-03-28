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

/** 1=Unopposed · 2=Guided · 3=Variable Constraint · 4=Advantage/Disadvantage · 5=Full Competition */
export const DRILL_LEVELS: Record<number, string> = {
  1: "Unopposed",
  2: "Guided",
  3: "Variable Constraint",
  4: "Adv / Disadv",
  5: "Full Competition",
};

/** 1=Technical · 2=Competitive · 3=Game-Speed */
export type IntensityLevel = 1 | 2 | 3;

export const INTENSITY_TIERS: Record<IntensityLevel, string> = {
  1: "Technical",
  2: "Competitive",
  3: "Game-Speed",
};

export type SessionPosition = "warmup" | "main" | "finishing";

/** Standardized objective tags for AI planner and reporting */
export const DRILL_OBJECTIVES = [
  "Active Recovery",
  "Ball Security",
  "Conditioning",
  "Finishing",
  "Footwork",
  "IQ/Read",
  "Precision",
  "Reaction Speed",
  "Scheme (Defense)",
  "Scheme (Offense)",
  "Transition",
] as const;

export type DrillObjective = typeof DRILL_OBJECTIVES[number];

/** Court space units — total per time block must not exceed 1.0 */
export const COURT_SPACES = [
  { label: "Full",        units: 1.00 },
  { label: "Side",        units: 0.50 },
  { label: "Half",        units: 0.50 },
  { label: "Quarter",     units: 0.25 },
  { label: "All Baskets", units: 1.00 },
] as const;

export interface Drill {
  id: string;
  name: string;
  /** One or more game-area categories */
  categories: string[];
  /** SPM — Rounded Average shots per player per minute at full pace */
  shot_density: number;
  /** Number of shot counter sessions used to build the SPM average */
  shot_sessions?: number;
  shot_type: ShotType;
  /** 1=Technical · 2=Competitive · 3=Game-Speed */
  intensity: IntensityLevel;
  /** Typical drill duration in minutes — pre-fills the planner timeline */
  default_duration?: number;
  /** Where in a practice session this drill belongs */
  session_position?: SessionPosition | null;
  /** Coach notes on what this drill develops and when to use it — feeds the AI planner */
  coaching_notes?: string | null;
  video_url: string;
  /** 1=Unopposed · 2=Guided Defense · 3=Variable Constraint · 4=Advantage/Disadvantage · 5=Full Competition */
  level?: number | null;
  /** Court space consumed — must not exceed 1.0 total per time block */
  space?: number | null;
  /** Standardized objective tags from DRILL_OBJECTIVES list */
  objectives?: string[];
  /** Link to a StatImpact by ID */
  primary_stat_id?: string | null;
}
