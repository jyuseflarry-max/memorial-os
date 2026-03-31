import { NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

export interface AttendanceConsequence {
  id:         string;
  event_type: "practice" | "game";
  status:     "excused" | "unexcused";
  makeup_work: string;
  updated_at: string;
}

/**
 * GET /api/attendance/consequences
 * Returns all 4 consequence rows for the caller's tenant.
 */
export async function GET() {
  try {
    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);

    const service = getSupabaseServer();
    const { data: myRecord } = await service.from("users").select("tenant_id").eq("id", me.id).single();
    if (!myRecord) return apiError("User record not found", 403);

    const { data, error } = await service
      .from("attendance_consequences")
      .select("id, event_type, status, makeup_work, updated_at")
      .eq("tenant_id", myRecord.tenant_id)
      .order("event_type")
      .order("status");

    if (error) throw error;

    // Ensure all 4 rows exist (upsert missing ones)
    const existing = new Set((data ?? []).map((r) => `${r.event_type}:${r.status}`));
    const all = [
      { event_type: "practice", status: "excused" },
      { event_type: "practice", status: "unexcused" },
      { event_type: "game",     status: "excused" },
      { event_type: "game",     status: "unexcused" },
    ] as const;

    const missing = all.filter((r) => !existing.has(`${r.event_type}:${r.status}`));
    if (missing.length > 0) {
      await service.from("attendance_consequences").insert(
        missing.map((r) => ({ ...r, tenant_id: myRecord.tenant_id, makeup_work: "" }))
      );
      // Re-fetch with the newly inserted rows
      const { data: full, error: e2 } = await service
        .from("attendance_consequences")
        .select("id, event_type, status, makeup_work, updated_at")
        .eq("tenant_id", myRecord.tenant_id)
        .order("event_type")
        .order("status");
      if (e2) throw e2;
      return Response.json(full ?? []);
    }

    return Response.json(data ?? []);
  } catch (err) {
    return apiError(err);
  }
}

/**
 * PATCH /api/attendance/consequences
 * Body: { id: string, makeup_work: string }
 * Updates one consequence row. Admin/Coach only.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { id, makeup_work } = await request.json() as { id: string; makeup_work: string };
    if (!id)            return apiError("id is required", 400);
    if (makeup_work === undefined) return apiError("makeup_work is required", 400);

    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);

    const service = getSupabaseServer();
    const { data: myRecord } = await service.from("users").select("tenant_id, role").eq("id", me.id).single();
    if (!myRecord) return apiError("User record not found", 403);
    if (!["Admin", "Coach"].includes(myRecord.role)) return apiError("Forbidden", 403);

    const { data, error } = await service
      .from("attendance_consequences")
      .update({ makeup_work, updated_at: new Date().toISOString(), updated_by: me.id })
      .eq("id", id)
      .eq("tenant_id", myRecord.tenant_id)
      .select("id, event_type, status, makeup_work, updated_at")
      .single();

    if (error) throw error;
    return Response.json(data);
  } catch (err) {
    return apiError(err);
  }
}
