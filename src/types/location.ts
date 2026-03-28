export interface Location {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  zip: string | null;
  is_home_venue: boolean;
  default_travel_time: number; // minutes
  notes: string | null;
  tenant_id: string | null;
  created_at: string;
}

export type LocationDraft = Omit<Location, "id" | "created_at">;

export const EMPTY_LOCATION_DRAFT: LocationDraft = {
  name: "",
  address: null,
  city: null,
  zip: null,
  is_home_venue: false,
  default_travel_time: 30,
  notes: null,
  tenant_id: null,
};
