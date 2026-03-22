export interface ProgramSettings {
  id: string;
  program_name: string;
  logo_url: string | null;
  season_start: string | null;        // YYYY-MM-DD
  print_orientation: "portrait" | "landscape";
  default_start_time: string;         // HH:MM
  primary_color: string;              // hex e.g. #ED1C24
  primary_color_dark: string;         // hex e.g. #C01920
  updated_at: string;
}

export const DEFAULT_SETTINGS: ProgramSettings = {
  id: "singleton",
  program_name: "Memorial Basketball OS",
  logo_url: null,
  season_start: null,
  print_orientation: "portrait",
  default_start_time: "15:00",
  primary_color: "#ED1C24",
  primary_color_dark: "#C01920",
  updated_at: new Date().toISOString(),
};
