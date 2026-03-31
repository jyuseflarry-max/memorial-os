import { NextRequest } from "next/server";
import { getDb }      from "@/lib/db";
import { apiError }   from "@/lib/api-error";
import { ROLE_COACH } from "@/lib/roles";

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
    const db = await getDb();

    const { data, error } = await db
      .from("attendance_consequences")
      .select("id, event_type, status, makeup_work, updated_at")
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
      await db.insert(
        "attendance_consequences",
        missing.map((r) => ({ ...r, makeup_work: "" }))
      );
      // Re-fetch with the newly inserted rows
      const { data: full, error: e2 } = await db
        .from("attendance_consequences")
        .select("id, event_type, status, makeup_work, updated_at")
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
    if (!id)                       return apiError("id is required", 400);
    if (makeup_work === undefined) return apiError("makeup_work is required", 400);

    const db = await getDb();
    if (!ROLE_COACH.includes(db.role)) return apiError("Forbidden", 403);

    const { data, error } = await db
      .update("attendance_consequences", { makeup_work, updated_at: new Date().toISOString(), updated_by: db.userId })
      .eq("id", id)
      .select("id, event_type, status, makeup_work, updated_at")
      .single();

    if (error) throw error;
    return Response.json(data);
  } catch (err) {
    return apiError(err);
  }
}
