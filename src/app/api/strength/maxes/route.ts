import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getSupabaseServer } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

/**
 * GET /api/strength/maxes?team_id=xxx
 * Returns all players (filtered by team) merged with their most recent max row.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const teamId = searchParams.get("team_id");

    const db = await getDb();

    // 1. Fetch players
    let pq = db
      .from("players")
      .select("id, name, jersey_number, team_id")
      .order("jersey_number", { ascending: true });
    if (teamId) pq = pq.eq("team_id", teamId);
    const { data: players, error: pErr } = await pq;
    if (pErr) throw pErr;

    if (!players || players.length === 0) return Response.json([]);

    // 2. Fetch latest max row per player (most recent recorded_on)
    type PlayerRow = { id: string; name: string; jersey_number: number | null; team_id: string | null };
    const playerIds = (players as PlayerRow[]).map((p) => p.id);
    const { data: maxRows, error: mErr } = await db
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

    const result = (players as PlayerRow[]).map((p) => {
      const mx = latestMap.get(p.id);
      return {
        player_id:     p.id,
        name:          p.name,
        jersey_number: p.jersey_number,
        back_squat:    mx?.back_squat   ?? null,
        power_clean:   mx?.power_clean  ?? null,
        bench_press:   mx?.bench_press  ?? null,
        recorded_on:   mx?.recorded_on  ?? null,
      };
    });

    return Response.json(result);
  } catch (err: unknown) {
    return apiError(err);
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

    // getDb() for auth + tenant context; use raw client for upsert with onConflict option
    const db = await getDb();
    const sb = getSupabaseServer();

    const { data, error } = await sb
      .from("player_maxes")
      .upsert(
        { player_id, back_squat, power_clean, bench_press, recorded_on, tenant_id: db.tenantId },
        { onConflict: "player_id,recorded_on" }
      )
      .select()
      .single();

    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return apiError(err);
  }
}
