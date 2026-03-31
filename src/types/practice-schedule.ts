export interface PracticeSchedule {
  id: string;
  practice_date: string;       // YYYY-MM-DD
  start_time: string;          // HH:MM
  end_time: string;            // HH:MM
  location_id: string | null;
  facility_id: string | null;
  team_name: string | null;
  team_id: string | null;
  plan_id: string | null;      // link to saved session if one exists
  notes: string | null;
  tenant_id: string | null;
  created_at: string;
  // joined
  location?: import("./location").Location | null;
  facility?: import("../app/api/facilities/route").Facility | null;
}

export type PracticeScheduleDraft = Omit<PracticeSchedule, "id" | "created_at" | "location" | "facility">;

export const EMPTY_PRACTICE_DRAFT: PracticeScheduleDraft = {
  practice_date: "",
  start_time: "15:30",
  end_time: "17:30",
  location_id: null,
  facility_id: null,
  team_name: null,
  team_id: null,
  plan_id: null,
  notes: null,
  tenant_id: null,
};
