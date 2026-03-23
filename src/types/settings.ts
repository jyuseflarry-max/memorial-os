export interface ProgramSettings {
  id: string;
  program_name: string;
  logo_url: string | null;
  current_season: string;             // e.g. "2025-2026"
  season_start: string | null;        // YYYY-MM-DD
  print_orientation: "portrait" | "landscape";
  default_start_time: string;         // HH:MM
  primary_color: string;              // hex e.g. #ED1C24
  primary_color_dark: string;         // hex e.g. #C01920
  enabled_modules: string[];          // nav group labels that are visible
  updated_at: string;
}

/** Returns the current basketball season label based on today's date.
 *  Seasons run Aug–Jul, so before August we're still in the prior year's season. */
export function currentSeasonLabel(): string {
  const now = new Date();
  const y = now.getFullYear();
  const startYear = now.getMonth() >= 7 ? y : y - 1; // month is 0-indexed; 7 = August
  return `${startYear}-${startYear + 1}`;
}

/** Generates season labels from `startYear` through `endYear` (inclusive), newest first. */
export function seasonOptions(pastYears = 6, futureYears = 3): string[] {
  const now = new Date();
  const y = now.getFullYear();
  const currentStart = now.getMonth() >= 7 ? y : y - 1;
  const options: string[] = [];
  for (let s = currentStart + futureYears; s >= currentStart - pastYears; s--) {
    options.push(`${s}-${s + 1}`);
  }
  return options;
}

export const DEFAULT_SETTINGS: ProgramSettings = {
  id: "singleton",
  program_name: "Memorial Basketball OS",
  logo_url: null,
  current_season: currentSeasonLabel(),
  season_start: null,
  print_orientation: "portrait",
  default_start_time: "15:00",
  primary_color: "#ED1C24",
  primary_color_dark: "#C01920",
  enabled_modules: ["Players", "Practice", "Reports", "Schedules", "Strength"],
  updated_at: new Date().toISOString(),
};
