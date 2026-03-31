import { NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

export interface Facility {
  id:         string;
  tenant_id:  string;
  name:       string;
  sort_order: number;
  created_at: string;
}

const DEFAULTS = [
  "Gym 1",
  "Gym 2",
  "Gym 3",
  "Gym Weightroom",
  "FH Weightroom",
  "Classroom",
];

export async function GET() {
  try {
    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);

    const service = getSupabaseServer();
    const { data: myRecord } = await service.from("users").select("tenant_id").eq("id", me.id).single();
    if (!myRecord) return apiError("User record not found", 403);

    const tenantId = myRecord.tenant_id;

    let { data, error } = await service
      .from("facilities")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("sort_order")
      .order("name");

    if (error) throw error;

    // Auto-seed defaults if tenant has no facilities yet
    if (!data || data.length === 0) {
      const seeds = DEFAULTS.map((name, i) => ({ tenant_id: tenantId, name, sort_order: i }));
      const { data: seeded, error: seedErr } = await service
        .from("facilities")
        .insert(seeds)
        .select("*")
        .order("sort_order");
      if (seedErr) throw seedErr;
      data = seeded;
    }

    return Response.json(data ?? []);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, sort_order } = await request.json();
    if (!name?.trim()) return apiError("name is required", 400);

    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);

    const service = getSupabaseServer();
    const { data: myRecord } = await service.from("users").select("tenant_id, role").eq("id", me.id).single();
    if (!myRecord) return apiError("User record not found", 403);
    if (!["Admin", "Coach", "Manager"].includes(myRecord.role)) return apiError("Forbidden", 403);

    const { data, error } = await service
      .from("facilities")
      .insert({ tenant_id: myRecord.tenant_id, name: name.trim(), sort_order: sort_order ?? 0 })
      .select("*")
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
