// ── Strength & Conditioning Master Module — Type Definitions ─────────────

export type BiologicalSex      = 'Male' | 'Female';
export type ReadinessStatus    = 'green' | 'yellow' | 'red';
export type TrafficLightStatus = 'green' | 'yellow' | 'red' | 'gray';
export type ExerciseCategory   = 'compound' | 'olympic' | 'isolation' | 'core' | 'conditioning' | 'mobility';
export type ProgramPhase       = 'accumulation' | 'intensification' | 'realization' | 'deload';

// ── Biometrics ────────────────────────────────────────────────────────────

/** Full record — returned to Coaches/Admins only (values decrypted server-side) */
export interface StrengthBiometrics {
  id: string;
  player_id: string;
  player_name?: string;
  jersey_number?: number | null;
  biological_sex: BiologicalSex | null;
  dob: string | null;              // YYYY-MM-DD — Coach-Only
  body_weight_lbs: number | null;  // Coach-Only
  age_display: string | null;      // '17y 3m' — computed server-side
  updated_at: string;
  updated_by: string | null;
}

/** Safe public view — no raw PII, safe to send to any role */
export interface BiometricsPublicView {
  player_id: string;
  biological_sex: BiologicalSex | null;
  has_dob: boolean;
  has_body_weight: boolean;
  age_display: string | null;
}

// ── Facility Inventory ────────────────────────────────────────────────────

export interface FacilityInventoryItem {
  id?: string;
  equipment_key: string;
  equipment_label: string;
  category: 'bars' | 'plates' | 'dumbbells_kettlebells' | 'machines' | 'accessories';
  available: boolean;
  quantity: number;
  notes?: string;
}

// ── Exercise Library ──────────────────────────────────────────────────────

export interface MuscleGroup {
  id: string;
  tenant_id: string;
  name: string;
  body_region: 'upper' | 'lower' | 'core' | 'full_body' | null;
  created_at: string;
}

export interface StrengthEquipment {
  id: string;
  tenant_id: string;
  name: string;
  created_at: string;
}

export interface WorkoutLogEntry {
  id: string;
  player_id: string;
  program_id: string;
  week: number;
  day: number;
  exercise_id: string;
  set_number: number;
  reps_completed: number | null;
  weight_lbs: number | null;
  logged_at: string;
}

export interface StrengthExercise {
  id: string;
  tenant_id: string | null;
  name: string;
  category: ExerciseCategory;
  primary_muscles: string[];
  secondary_muscles: string[];
  equipment_keys: string[];
  demo_video_url: string | null;
  coaching_cues: string | null;
  is_primary_lift: boolean;
  is_global: boolean; // true when tenant_id is null
  primary_muscle_group_id: string | null;
  secondary_muscle_group_ids: string[];
  equipment_ids: string[];
}

// ── Lift Records ──────────────────────────────────────────────────────────

export interface StrengthLift {
  id: string;
  player_id: string;
  exercise_id: string;
  exercise_name?: string;
  weight_lbs: number;
  reps: number;
  estimated_1rm: number;
  tempo: string | null;
  is_verified: boolean;
  verified_by?: string | null;
  verification_video_url?: string | null;
  recorded_at: string;
  session_notes: string | null;
}

// ── Readiness ─────────────────────────────────────────────────────────────

export interface ReadinessScore {
  id: string;
  player_id: string;
  score_date: string;    // YYYY-MM-DD
  status: ReadinessStatus;
  sleep_hours: number | null;
  soreness: number | null;  // 1–10
  energy: number | null;    // 1–10
  notes: string | null;
}

// ── Programs ──────────────────────────────────────────────────────────────

export interface ProgramBlock {
  week: number;
  day: number;
  exercise_id: string;
  exercise_name?: string;
  sets: number;
  reps: string;                  // '5' | '3-5' | 'AMRAP'
  intensity_pct: number;         // % of 1RM
  tempo: string;                 // '2-0-X-1'
  rest_seconds: number;
  notes: string;
  demo_video_url?: string | null;
}

export interface StrengthProgram {
  id: string;
  name: string;
  description: string | null;
  weeks: number;
  phase: ProgramPhase | null;
  blocks: ProgramBlock[];
  created_at: string;
  updated_at: string;
}

// ── Plate Calculator ──────────────────────────────────────────────────────

export interface PlateConfig {
  barWeight: number;
  targetWeight: number;
  roundedTarget: number;
  weightPerSide: number;
  platesPerSide: { weight: number; count: number }[];
  achievable: boolean;
}

// ── Executive Dashboard ───────────────────────────────────────────────────

export interface PlayerStrengthCard {
  player_id: string;
  player_name: string;
  jersey_number: number | null;
  team_id: string | null;
  class_year: string | null;
  traffic_light: TrafficLightStatus;
  today_readiness: ReadinessStatus | null;
  best_swr: number | null;
  best_lift_name: string | null;
  best_1rm: number | null;
  lift_trend: 'up' | 'down' | 'flat' | null;
  weeks_since_update: number | null;
}

// ── Leaderboard ───────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  player_id: string;
  player_name: string;
  best_1rm: number;
  swr: number | null;
  is_verified: boolean;
}

// ── Anonymous Benchmark Pool (cross-tenant, no PII) ───────────────────────

export interface BenchmarkPercentiles {
  exercise_id: string;
  exercise_name: string;
  biological_sex: BiologicalSex;
  age_years: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  sample_size: number;
}
