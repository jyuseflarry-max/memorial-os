import type { PlateConfig, TrafficLightStatus } from '@/types/strength';

// ── Equipment Catalog ─────────────────────────────────────────────────────

export const EQUIPMENT_CATALOG = [
  // Bars
  { key: 'bar_45',    label: '45lb Olympic Bar',          category: 'bars' as const },
  { key: 'bar_35',    label: '35lb Olympic Bar (Women\'s)',category: 'bars' as const },
  { key: 'trap_bar',  label: 'Trap / Hex Bar',            category: 'bars' as const },
  { key: 'ez_curl_bar', label: 'EZ Curl Bar',             category: 'bars' as const },
  { key: 'ssb',       label: 'Safety Squat Bar',          category: 'bars' as const },
  // Plates
  { key: 'plate_45',    label: '45lb Plates',   category: 'plates' as const },
  { key: 'plate_35',    label: '35lb Plates',   category: 'plates' as const },
  { key: 'plate_25',    label: '25lb Plates',   category: 'plates' as const },
  { key: 'plate_10',    label: '10lb Plates',   category: 'plates' as const },
  { key: 'plate_5',     label: '5lb Plates',    category: 'plates' as const },
  { key: 'plate_2_5',   label: '2.5lb Plates',  category: 'plates' as const },
  { key: 'plate_1_25',  label: '1.25lb Plates', category: 'plates' as const },
  // Dumbbells & Kettlebells
  { key: 'dumbbell_set',   label: 'Dumbbell Set',   category: 'dumbbells_kettlebells' as const },
  { key: 'kettlebell_set', label: 'Kettlebell Set', category: 'dumbbells_kettlebells' as const },
  // Machines
  { key: 'rack',            label: 'Squat Rack / Power Cage', category: 'machines' as const },
  { key: 'bench_flat',      label: 'Flat Bench',              category: 'machines' as const },
  { key: 'bench_incline',   label: 'Incline Bench',           category: 'machines' as const },
  { key: 'cable_machine',   label: 'Cable Machine',           category: 'machines' as const },
  { key: 'leg_press_machine',label: 'Leg Press',              category: 'machines' as const },
  { key: 'smith_machine',   label: 'Smith Machine',           category: 'machines' as const },
  { key: 'ghd_machine',     label: 'GHD Machine',             category: 'machines' as const },
  { key: 'nordic_machine',  label: 'Nordic Curl Machine',     category: 'machines' as const },
  // Accessories
  { key: 'pull_up_bar',     label: 'Pull-up Bar',        category: 'accessories' as const },
  { key: 'dip_station',     label: 'Dip Station',        category: 'accessories' as const },
  { key: 'plyo_boxes',      label: 'Plyo Boxes',         category: 'accessories' as const },
  { key: 'sled',            label: 'Sled / Prowler',     category: 'accessories' as const },
  { key: 'battle_ropes',    label: 'Battle Ropes',       category: 'accessories' as const },
  { key: 'med_balls',       label: 'Medicine Balls',     category: 'accessories' as const },
  { key: 'bands',           label: 'Resistance Bands',   category: 'accessories' as const },
  { key: 'ab_wheel',        label: 'Ab Wheel',           category: 'accessories' as const },
  { key: 'foam_roller',     label: 'Foam Roller',        category: 'accessories' as const },
  { key: 'landmine_attachment', label: 'Landmine Attachment', category: 'accessories' as const },
] as const;

export type EquipmentKey = typeof EQUIPMENT_CATALOG[number]['key'];
export type EquipmentCategory = typeof EQUIPMENT_CATALOG[number]['category'];

/** Available plate denominations for the calculator, heaviest first */
const PLATE_DENOMINATIONS = [45, 35, 25, 10, 5, 2.5, 1.25];

export const PLATE_COLORS: Record<number, { bg: string; text: string }> = {
  45:   { bg: '#1d4ed8', text: '#fff' },
  35:   { bg: '#15803d', text: '#fff' },
  25:   { bg: '#dc2626', text: '#fff' },
  10:   { bg: '#ca8a04', text: '#fff' },
  5:    { bg: '#7c3aed', text: '#fff' },
  2.5:  { bg: '#6b7280', text: '#fff' },
  1.25: { bg: '#d1d5db', text: '#111' },
};

// ── Plate Calculator ──────────────────────────────────────────────────────

/**
 * Given a target load, bar weight, and which plates are available,
 * compute the exact plate stack per side using a greedy algorithm.
 */
export function calcPlates(
  targetLbs: number,
  barLbs: 45 | 35,
  availablePlateKeys: string[] = [],
): PlateConfig {
  // Map available plate keys → denominations
  const available = PLATE_DENOMINATIONS.filter(d => {
    const key = `plate_${String(d).replace('.', '_')}`;
    return availablePlateKeys.length === 0 || availablePlateKeys.includes(key);
  });

  const roundedTarget = Math.round(targetLbs / 5) * 5;
  const remainder     = roundedTarget - barLbs;
  const perSide       = remainder / 2;

  const platesPerSide: { weight: number; count: number }[] = [];
  let remaining = Math.max(0, perSide);

  for (const d of available.sort((a, b) => b - a)) {
    if (remaining <= 0) break;
    const count = Math.floor(remaining / d);
    if (count > 0) {
      platesPerSide.push({ weight: d, count });
      remaining -= d * count;
    }
  }

  return {
    barWeight: barLbs,
    targetWeight: targetLbs,
    roundedTarget,
    weightPerSide: perSide,
    platesPerSide,
    achievable: Math.abs(remaining) < 0.01,
  };
}

// ── Strength-to-Weight Ratio ──────────────────────────────────────────────

/** SWR = lift_weight / body_weight, rounded to 2 decimal places */
export function calcSWR(liftLbs: number, bodyWeightLbs: number): number {
  if (!bodyWeightLbs || bodyWeightLbs <= 0) return 0;
  return Math.round((liftLbs / bodyWeightLbs) * 100) / 100;
}

// ── Epley Estimated 1RM ───────────────────────────────────────────────────

export function calcEstimated1RM(weightLbs: number, reps: number): number {
  if (reps === 1) return weightLbs;
  return Math.round(weightLbs * (1 + reps / 30));
}

// ── Recovery Targets ──────────────────────────────────────────────────────

export interface RecoveryTargets {
  protein_g: number;      // post-workout (0.4g × BW)
  daily_protein_g: number;// daily minimum (0.7g × BW)
  hydration_oz: number;   // daily baseline (0.5 × BW)
  note: string;
}

export function calcRecovery(bodyWeightLbs: number): RecoveryTargets {
  return {
    protein_g:       Math.round(bodyWeightLbs * 0.4),
    daily_protein_g: Math.round(bodyWeightLbs * 0.7),
    hydration_oz:    Math.round(bodyWeightLbs * 0.5),
    note: 'Add 16oz per lb of sweat lost during training',
  };
}

// ── Athletic Age ──────────────────────────────────────────────────────────

export function calcAthleticAge(dobIso: string): { years: number; months: number; display: string } {
  const dob = new Date(dobIso);
  const now = new Date();
  let years  = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth()    - dob.getMonth();
  if (months < 0)                         { years--; months += 12; }
  if (now.getDate() < dob.getDate())      { months--; }
  if (months < 0)                         { years--; months += 12; }
  return { years, months, display: `${years}y ${months}m` };
}

// ── Tempo ─────────────────────────────────────────────────────────────────

/** Validate 4-digit tempo e.g. "2-0-X-1" */
export function isValidTempo(tempo: string): boolean {
  return /^([0-9X])-([0-9X])-([0-9X])-([0-9X])$/i.test(tempo.trim());
}

export function parseTempo(tempo: string): { eccentric: string; pause: string; concentric: string; reset: string } | null {
  const m = tempo.trim().toUpperCase().match(/^([0-9X])-([0-9X])-([0-9X])-([0-9X])$/);
  if (!m) return null;
  return { eccentric: m[1], pause: m[2], concentric: m[3], reset: m[4] };
}

// ── Traffic Light ─────────────────────────────────────────────────────────

interface LiftPoint { weight_lbs: number; recorded_at: string }

/**
 * Derive a single-exercise traffic light from recent lift history.
 *   GREEN  — latest ≥ previous (progress or holding)
 *   YELLOW — last 3 sessions same weight (plateau)
 *   RED    — latest < previous (regression)
 *   GRAY   — fewer than 2 data points
 */
export function calcLiftTrafficLight(lifts: LiftPoint[]): TrafficLightStatus {
  if (lifts.length < 2) return 'gray';
  const sorted = [...lifts].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime(),
  );
  if (sorted.length >= 3) {
    const last3 = sorted.slice(0, 3).map(l => l.weight_lbs);
    if (last3.every(w => w === last3[0])) return 'yellow';
  }
  return sorted[0].weight_lbs < sorted[1].weight_lbs ? 'red' : 'green';
}

/**
 * Composite traffic light factoring in both lift trend and recent readiness.
 * 3+ consecutive red readiness scores = overtraining risk → RED regardless of lifts.
 */
export function compositeTrafficLight(
  liftStatus: TrafficLightStatus,
  recentReadiness: Array<'green' | 'yellow' | 'red'>,
): TrafficLightStatus {
  const redCount = recentReadiness.filter(r => r === 'red').length;
  if (redCount >= 3)                                   return 'red';
  if (liftStatus === 'red')                            return 'red';
  if (liftStatus === 'yellow' || redCount >= 2)        return 'yellow';
  return liftStatus === 'gray' ? 'gray' : 'green';
}

// ── Readiness Auto-Status ─────────────────────────────────────────────────

/**
 * Auto-compute readiness status from raw inputs.
 *   GREEN  — sleep ≥ 7h, soreness ≤ 3, energy ≥ 7
 *   RED    — sleep < 5h OR soreness ≥ 8 OR energy ≤ 3
 *   YELLOW — everything else
 */
export function autoReadinessStatus(
  sleep: number,
  soreness: number,
  energy: number,
): 'green' | 'yellow' | 'red' {
  if (sleep < 5 || soreness >= 8 || energy <= 3) return 'red';
  if (sleep >= 7 && soreness <= 3 && energy >= 7) return 'green';
  return 'yellow';
}

/** Readiness-based load modifier: green=100%, yellow=90%, red=80% */
export function readinessLoadFactor(status: 'green' | 'yellow' | 'red'): number {
  return status === 'green' ? 1.0 : status === 'yellow' ? 0.9 : 0.8;
}

/**
 * Maps Vibe Check inputs (1-5 scale) to a readiness status.
 * Vibe Check soreness/mood_energy use 1-5; sleep_hours is raw hours.
 */
export function vibeToReadinessStatus(
  sleepHours: number,
  soreness: number,   // 1-5 (1=none, 5=extreme)
  moodEnergy: number, // 1-5 (1=low, 5=great)
): 'green' | 'yellow' | 'red' {
  if (sleepHours < 5 || soreness >= 4 || moodEnergy <= 2) return 'red';
  if (sleepHours >= 7 && soreness <= 2 && moodEnergy >= 4) return 'green';
  return 'yellow';
}

// ── De-identification for Benchmark Pool ────────────────────────────────

/**
 * Strips all PII before contributing to the cross-tenant benchmark pool.
 * Only age bucket (floor year), sex, SWR, and truncated month are kept.
 * NO tenant_id, player_id, or names are ever submitted.
 */
export function deidentifyForBenchmark(opts: {
  dobIso: string;
  biologicalSex: 'Male' | 'Female';
  liftLbs: number;
  bodyWeightLbs: number;
}): { age_years: number; biological_sex: string; swr: number; recorded_month: string } {
  const { years } = calcAthleticAge(opts.dobIso);
  const swr = calcSWR(opts.liftLbs, opts.bodyWeightLbs);
  const now = new Date();
  const recorded_month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  return { age_years: years, biological_sex: opts.biologicalSex, swr, recorded_month };
}
