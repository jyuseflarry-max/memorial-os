import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-error";
import { notifyAttendanceStatus } from "@/lib/attendance-notify";

/** GET /api/attendance?date=YYYY-MM-DD&team_id=... */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date   = searchParams.get("date");
    const teamId = searchParams.get("team_id");

    if (!date) return apiError("date is required", 400);

    const db = await getDb();

    let query = db
      .from("practice_attendance")
      .select("id, player_id, status, event_type, notes, makeup_required, makeup_proof_url, makeup_proof_name, makeup_completed_at")
      .eq("practice_date", date);

    if (teamId) query = query.eq("team_id", teamId);
    else        query = query.is("team_id", null);

    const { data, error } = await query;
    if (error) throw error;

    return Response.json(data ?? []);
  } catch (err) {
    return apiError(err);
  }
}

/** POST /api/attendance — upsert an absence record (always starts as unexcused) */
export async function POST(request: NextRequest) {
  try {
    const { practice_date, player_id, team_id, notes, event_type, is_school_event } = await request.json();

    if (!practice_date || !player_id) return apiError("practice_date and player_id required", 400);
    const resolvedEventType = event_type === "game" ? "game" : "practice";
    const resolvedStatus    = is_school_event ? "school_event" : "unexcused";
    const resolvedMakeup    = is_school_event ? false : true;

    const db = await getDb();

    // Delete any existing record first, then insert fresh
    // (avoids upsert issues with functional unique indexes on nullable team_id)
    let delQuery = db
      .delete("practice_attendance")
      .eq("practice_date", practice_date)
      .eq("player_id", player_id);
    if (team_id) delQuery = delQuery.eq("team_id", team_id);
    else         delQuery = delQuery.is("team_id", null);
    await delQuery;

    const { data, error } = await db
      .insert("practice_attendance", {
        team_id:         team_id ?? null,
        practice_date,
        player_id,
        status:          resolvedStatus,
        notes:           notes ?? null,
        event_type:      resolvedEventType,
        makeup_required: resolvedMakeup,
      })
      .select("id, player_id, status, notes")
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}

/** PATCH /api/attendance — coach reviews an absence: set status, makeup_required, notes */
export async function PATCH(request: NextRequest) {
  try {
    const { id, status, notes } = await request.json();
    if (!id) return apiError("id is required", 400);
    if (status && !["excused", "unexcused", "school_event"].includes(status)) return apiError("invalid status", 400);

    const db = await getDb();
    if (!["Admin", "Coach", "Manager"].includes(db.role)) return apiError("Forbidden", 403);

    const isSchoolEvent = status === "school_event";
    const updates: Record<string, unknown> = {
      reviewed_by:     db.userId,
      reviewed_at:     new Date().toISOString(),
      makeup_required: isSchoolEvent ? false : true,
    };
    if (status !== undefined) updates.status = status;
    if (notes  !== undefined) updates.notes  = notes;

    const { data, error } = await db
      .update("practice_attendance", updates)
      .eq("id", id)
      .select("id, player_id, practice_date, event_type, status, notes, makeup_required, reviewed_by, reviewed_at")
      .single();

    if (error) throw error;

    // School events have no consequence and no player notification
    if (data.status === "school_event") {
      return Response.json(data);
    }

    // Look up the makeup work description for this event_type + status combination
    const resolvedStatus    = (data.status ?? "unexcused") as "excused" | "unexcused";
    const resolvedEventType = (data.event_type ?? "practice") as "practice" | "game";
    const { data: consequence } = await db
      .from("attendance_consequences")
      .select("makeup_work")
      .eq("event_type", resolvedEventType)
      .eq("status", resolvedStatus)
      .single();

    // Fire-and-forget notification to the player
    void notifyAttendanceStatus({
      tenantId:     db.tenantId,
      fromUserId:   db.userId,
      playerId:     data.player_id,
      practiceDate: data.practice_date,
      eventType:    resolvedEventType,
      status:       resolvedStatus,
      notes:        data.notes ?? null,
      makeupWork:   consequence?.makeup_work ?? "",
    });

    return Response.json(data);
  } catch (err) {
    return apiError(err);
  }
}

/** DELETE /api/attendance?date=&player_id=&team_id= — mark present (remove absence) */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date     = searchParams.get("date");
    const playerId = searchParams.get("player_id");
    const teamId   = searchParams.get("team_id");

    if (!date || !playerId) return apiError("date and player_id required", 400);

    const db = await getDb();

    let query = db
      .delete("practice_attendance")
      .eq("practice_date", date)
      .eq("player_id", playerId);

    if (teamId) query = query.eq("team_id", teamId);
    else        query = query.is("team_id", null);

    const { error } = await query;
    if (error) throw error;

    return Response.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
