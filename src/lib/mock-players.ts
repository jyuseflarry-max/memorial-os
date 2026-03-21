import { Player, PlayerStatus } from "@/types/player";

export const MOCK_PLAYERS: Player[] = [
  { id: "p1",  name: "Jordan Wallace",  jersey_number: 1,  position: "PG", class_year: "Junior",    status: PlayerStatus.Active,     titan_load: 420,  latest_vibe_score: 4.5 },
  { id: "p2",  name: "Darius Okafor",   jersey_number: 5,  position: "SG", class_year: "Senior",    status: PlayerStatus.Active,     titan_load: 610,  latest_vibe_score: 3.2 },
  { id: "p3",  name: "Marcus Torres",   jersey_number: 11, position: "SF", class_year: "Sophomore",  status: PlayerStatus.Active,     titan_load: 380,  latest_vibe_score: 4.0 },
  { id: "p4",  name: "Caleb Brown",     jersey_number: 23, position: "PF", class_year: "Senior",    status: PlayerStatus.Restricted, titan_load: 820,  latest_vibe_score: 2.1 },
  { id: "p5",  name: "Rohan Singh",     jersey_number: 34, position: "C",  class_year: "Junior",    status: PlayerStatus.Active,     titan_load: 290,  latest_vibe_score: 4.8 },
  { id: "p6",  name: "Theo Park",       jersey_number: 3,  position: "SG", class_year: "Freshman",  status: PlayerStatus.Active,     titan_load: 540,  latest_vibe_score: 3.0 },
  { id: "p7",  name: "Isaiah Grant",    jersey_number: 14, position: "PG", class_year: "Senior",    status: PlayerStatus.Out,        titan_load: 940,  latest_vibe_score: 1.8 },
  { id: "p8",  name: "Devon Marsh",     jersey_number: 42, position: "C",  class_year: "Sophomore",  status: PlayerStatus.Active,     titan_load: 460,  latest_vibe_score: 3.7 },
  { id: "p9",  name: "Amir Jackson",    jersey_number: 7,  position: "SF", class_year: "Junior",    status: PlayerStatus.Active,     titan_load: 310,  latest_vibe_score: 4.2 },
  { id: "p10", name: "Tyler Reeves",    jersey_number: 21, position: "PF", class_year: "Freshman",  status: PlayerStatus.Restricted, titan_load: 750,  latest_vibe_score: 2.5 },
];
