import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/strength/maxes?team_id=xxx
 * Returns all players (filtered by team) merged with their most recent max row.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const teamId = searchParams.get("team_id");

    const supabase = getSupabaseServer();

    // 1. Fetch players
    let pq = supabase
      .from("players")
      .select("id, name, jersey_number, team_id")
      .order("jersey_number", { ascending: true });
    if (teamId) pq = pq.eq("team_id", teamId);
    const { data: players, error: pErr } = await pq;
    if (pErr) throw pErr;

    if (!players || players.length === 0) return Response.json([]);

    // 2. Fetch latest max row per player (most recent recorded_on)
    const playerIds = players.map((p) => p.id);
    const { data: maxRows, error: mErr } = await supabase
      .from("player_maxes")
      .select("player_id, back_squat, power_clean, bench_press, recorded_on")
      .in("player_id", playerIds)
      .order("recorded_on", { ascending: false });
    if (mErr) throw mErr;

    // Keep only the most recent row per player
    const latestMap = new Map<string, typeof maxRows[number]>();
    for (const row of maxRows ?? []) {
      if (!latestMap.has(row.player_id)) latestMap.set(row.player_id, row);
    }

    const result = players.map((p) => {
      const mx = latestMap.get(p.id);
      return {
        player_id:    p.id,
        name:         p.name,
        jersey_number: p.jersey_number,
        back_squat:   mx?.back_squat   ?? null,
        power_clean:  mx?.power_clean  ?? null,
        bench_press:  mx?.bench_press  ?? null,
        recorded_on:  mx?.recorded_on  ?? null,
      };
    });

    return Response.json(result);
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

/**
 * POST /api/strength/maxes
 * Body: { player_id, back_squat?, power_clean?, bench_press?, recorded_on }
 * Upserts on (player_id, recorded_on) — one record per player per day.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { player_id, back_squat, power_clean, bench_press, recorded_on } = body;

    if (!player_id || !recorded_on) {
      return Response.json({ error: "player_id and recorded_on are required" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("player_maxes")
      .upsert(
        { player_id, back_squat, power_clean, bench_press, recorded_on },
        { onConflict: "player_id,recorded_on" }
      )
      .select()
      .single();

    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
