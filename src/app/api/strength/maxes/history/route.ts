import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-error";

/**
 * GET /api/strength/maxes/history?player_id=xxx&limit=3
 * Returns the last N max records for a player, newest first.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const playerId = searchParams.get("player_id");
    const limit    = parseInt(searchParams.get("limit") ?? "3", 10);

    if (!playerId) {
      return Response.json({ error: "player_id is required" }, { status: 400 });
    }

    const db = await getDb();
    const { data, error } = await db
      .from("player_maxes")
      .select("back_squat, power_clean, bench_press, recorded_on")
      .eq("player_id", playerId)
      .order("recorded_on", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return Response.json(data ?? []);
  } catch (err: unknown) {
    return apiError(err);
  }
}
