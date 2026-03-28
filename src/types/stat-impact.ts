export interface StatImpact {
  id: string;
  name: string;
  color: string;
  tenant_id: string | null;
  created_at: string;
}

export type StatImpactDraft = Omit<StatImpact, "id" | "created_at">;
