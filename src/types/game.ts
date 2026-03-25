export type LocationType = "home" | "away" | "neutral";
export type GameType = "non-district" | "district" | "scrimmage" | "tournament" | "playoffs";

export interface Game {
  id: string;
  team_id: string | null;
  season: string;            // e.g. "2025-2026"
  game_date: string;         // YYYY-MM-DD
  game_time: string | null;  // HH:MM (24-hr)
  time_tbd: boolean;
  opponent: string;
  location_type: LocationType;
  game_type: GameType;
  score_us: number | null;
  score_them: number | null;
  highlights_url: string | null;
  box_score_url: string | null;
  game_writeup: string | null;
  venue: string | null;
  created_at: string;
  updated_at: string;
}

export const LOCATION_LABELS: Record<LocationType, string> = {
  home:    "Home",
  away:    "Away",
  neutral: "Neutral",
};

export const GAME_TYPE_LABELS: Record<GameType, string> = {
  "non-district": "Non-District",
  district:       "District",
  scrimmage:      "Scrimmage",
  tournament:     "Tournament",
  playoffs:       "Playoffs",
};

export type GameDraft = Omit<Game, "id" | "created_at" | "updated_at">;

export const EMPTY_DRAFT: GameDraft = {
  team_id:        null,
  season:         "",
  game_date:      "",
  game_time:      null,
  time_tbd:       false,
  opponent:       "",
  location_type:  "home",
  game_type:      "non-district",
  score_us:       null,
  score_them:     null,
  highlights_url: null,
  box_score_url:  null,
  game_writeup:   null,
  venue:          null,
};
