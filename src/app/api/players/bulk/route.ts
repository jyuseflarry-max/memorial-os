import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * POST /api/players/bulk
 * Body: { players: NewPlayerData[] }
 * Returns: { added: number, players: Player[] }
 */
export async function POST(request: NextRequest) {
  try {
    const { players } = await request.json();

    if (!Array.isArray(players) || players.length === 0) {
      return Response.json({ error: "No players provided" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const now = new Date().toISOString();

    const rows = players.map((p: Record<string, unknown>) => ({
      ...p,
      latest_vibe_score: 3.0,
      updated_at: now,
    }));

    const { data, error } = await supabase
      .from("players")
      .insert(rows)
      .select();

    if (error) throw error;
    return Response.json({ added: data.length, players: data }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
