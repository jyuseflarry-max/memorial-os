import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

/**
 * GET /api/vibe-checks
 * Returns the most recent vibe_check row per player as
 * { [player_id]: VibeCheckRow }
 */
export async function GET(request: NextRequest) {
  try {
    const seasonStart = request.nextUrl.searchParams.get("season_start");
    const supabase    = getSupabaseServer();

    let query = supabase
      .from("vibe_checks")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (seasonStart) query = query.gte("submitted_at", seasonStart);

    const { data, error } = await query;
    if (error) throw error;

    // Keep only the latest submission per player
    const latest = new Map<string, (typeof data)[number]>();
    for (const row of data) {
      if (!latest.has(row.player_id)) latest.set(row.player_id, row);
    }

    return Response.json(Object.fromEntries(latest));
  } catch (err: unknown) {
    return apiError(err);
  }
}

/**
 * POST /api/vibe-checks
 * Body: { player_id, sleep_hours, soreness, stress, mood_energy, vibe_score }
 * Inserts into vibe_checks AND updates players.latest_vibe_score
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { player_id, sleep_hours, soreness, stress, mood_energy, vibe_score } = body;

    if (!player_id || vibe_score === undefined) {
      return Response.json({ error: "player_id and vibe_score are required" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // 1. Insert the full vibe check record
    const { error: insertError } = await supabase.from("vibe_checks").insert({
      player_id, sleep_hours, soreness, stress, mood_energy, vibe_score,
    });
    if (insertError) throw insertError;

    // 2. Update the player's latest_vibe_score so dashboards reflect it immediately
    const { error: updateError } = await supabase
      .from("players")
      .update({ latest_vibe_score: vibe_score, updated_at: new Date().toISOString() })
      .eq("id", player_id);
    if (updateError) throw updateError;

    return Response.json({ ok: true }, { status: 201 });
  } catch (err: unknown) {
    return apiError(err);
  }
}
