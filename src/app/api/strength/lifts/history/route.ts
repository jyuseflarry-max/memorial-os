/**
 * GET /api/strength/lifts/history?player_id=X&exercise_id=Y
 * Returns all lift records for a player+exercise in chronological order.
 * player_id=me resolves to the authenticated user's id.
 * Used to render progress charts.
 */
import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getSupabaseServer } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const playerId   = searchParams.get("player_id");
    const exerciseId = searchParams.get("exercise_id");

    const resolvedPlayerId = playerId === "me" ? db.userId : playerId;
    if (!resolvedPlayerId || !exerciseId)
      return apiError("player_id and exercise_id are required", 400);

    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from("strength_lifts")
      .select("id, weight_lbs, reps, estimated_1rm, recorded_at")
      .eq("tenant_id", db.tenantId)
      .eq("player_id", resolvedPlayerId)
      .eq("exercise_id", exerciseId)
      .order("recorded_at", { ascending: true });

    if (error) throw error;
    return Response.json(data ?? []);
  } catch (err) {
    return apiError(err);
  }
}
