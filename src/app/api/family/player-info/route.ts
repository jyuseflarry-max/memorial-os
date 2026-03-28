import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

/**
 * GET /api/family/player-info?playerID=[id]
 *
 * Public (no auth required) — returns minimal player info for the join flow.
 * Only exposes name and team; no sensitive data.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get("playerID");
    if (!playerId) return apiError("playerID is required", 400);

    const service = getSupabaseServer();
    const { data: player } = await service
      .from("players")
      .select("id, name, team_id")
      .eq("id", playerId)
      .single();

    if (!player) return apiError("Player not found", 404);

    return Response.json({ id: player.id, name: player.name, teamId: player.team_id });
  } catch (err: unknown) {
    return apiError(err);
  }
}
