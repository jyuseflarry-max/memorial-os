export interface DrillGroup {
  name: string;
  playerIds: string[];
}

export interface PlayerGrouping {
  id: string;
  name: string;
  team_id: string | null;
  groups: DrillGroup[];
  created_at: string;
}
