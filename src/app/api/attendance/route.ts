import { NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

/** GET /api/attendance?date=YYYY-MM-DD&team_id=... */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date    = searchParams.get("date");
    const teamId  = searchParams.get("team_id");

    if (!date) return apiError("date is required", 400);

    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);

    const service = getSupabaseServer();
    const { data: myRecord } = await service.from("users").select("tenant_id").eq("id", me.id).single();
    if (!myRecord) return apiError("User record not found", 403);

    let query = service
      .from("practice_attendance")
      .select("id, player_id, status, notes")
      .eq("tenant_id", myRecord.tenant_id)
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

/** POST /api/attendance — upsert an absence record */
export async function POST(request: NextRequest) {
  try {
    const { practice_date, player_id, team_id, status, notes } = await request.json();

    if (!practice_date || !player_id) return apiError("practice_date and player_id required", 400);
    if (!["excused", "unexcused"].includes(status)) return apiError("status must be excused or unexcused", 400);

    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);

    const service = getSupabaseServer();
    const { data: myRecord } = await service.from("users").select("tenant_id").eq("id", me.id).single();
    if (!myRecord) return apiError("User record not found", 403);

    // Delete any existing record first, then insert fresh
    // (avoids upsert issues with functional unique indexes on nullable team_id)
    let delQuery = service
      .from("practice_attendance")
      .delete()
      .eq("tenant_id", myRecord.tenant_id)
      .eq("practice_date", practice_date)
      .eq("player_id", player_id);
    if (team_id) delQuery = delQuery.eq("team_id", team_id);
    else         delQuery = delQuery.is("team_id", null);
    await delQuery;

    const { data, error } = await service
      .from("practice_attendance")
      .insert({
        tenant_id:     myRecord.tenant_id,
        team_id:       team_id ?? null,
        practice_date,
        player_id,
        status,
        notes:         notes ?? null,
      })
      .select("id, player_id, status, notes")
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
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

    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);

    const service = getSupabaseServer();
    const { data: myRecord } = await service.from("users").select("tenant_id").eq("id", me.id).single();
    if (!myRecord) return apiError("User record not found", 403);

    let query = service
      .from("practice_attendance")
      .delete()
      .eq("tenant_id", myRecord.tenant_id)
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
