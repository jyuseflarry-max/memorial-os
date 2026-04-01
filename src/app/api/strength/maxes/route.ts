import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getSupabaseServer } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

// GET /api/strength/maxes?player_id=X&exercise_id=Y
// Returns best estimated_1rm per (player, exercise) combination.
// player_id=me resolves to the authenticated user's id server-side.
export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const sb = getSupabaseServer();
    const { searchParams } = new URL(req.url);
    const playerId   = searchParams.get("player_id");
    const exerciseId = searchParams.get("exercise_id");

    // Resolve "me" to the current user's id
    const resolvedPlayerId = playerId === "me" ? db.userId : playerId;

    // Fetch all lifts sorted by estimated_1rm desc so first-seen per key = best
    let q = sb
      .from("strength_lifts")
      .select("id, player_id, exercise_id, weight_lbs, reps, estimated_1rm, recorded_at")
      .eq("tenant_id", db.tenantId)
      .order("estimated_1rm", { ascending: false });

    if (resolvedPlayerId) q = q.eq("player_id", resolvedPlayerId);
    if (exerciseId)       q = q.eq("exercise_id", exerciseId);

    const { data, error } = await q;
    if (error) throw error;

    // Keep only the best record per (player_id, exercise_id)
    const bestMap = new Map<string, (typeof data)[0]>();
    for (const lift of data ?? []) {
      const key = `${lift.player_id}:${lift.exercise_id}`;
      if (!bestMap.has(key)) bestMap.set(key, lift);
    }

    return Response.json([...bestMap.values()]);
  } catch (err) {
    return apiError(err);
  }
}
