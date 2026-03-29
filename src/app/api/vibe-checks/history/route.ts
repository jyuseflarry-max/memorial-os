import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-error";

/**
 * GET /api/vibe-checks/history?season_start=YYYY-MM-DD
 * Returns ALL vibe_check rows grouped by player_id:
 * { [player_id]: VibeCheckRow[] }  (newest first per player)
 */
export async function GET(request: NextRequest) {
  try {
    const seasonStart = request.nextUrl.searchParams.get("season_start");
    const db          = await getDb();

    let query = db
      .from("vibe_checks")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (seasonStart) query = query.gte("submitted_at", seasonStart);

    const { data, error } = await query;
    if (error) throw error;

    const grouped: Record<string, typeof data> = {};
    for (const row of data) {
      if (!grouped[row.player_id]) grouped[row.player_id] = [];
      grouped[row.player_id].push(row);
    }

    return Response.json(grouped);
  } catch (err: unknown) {
    return apiError(err);
  }
}
