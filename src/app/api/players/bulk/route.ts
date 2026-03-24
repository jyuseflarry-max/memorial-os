import { NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

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

    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);

    const supabase = getSupabaseServer();
    const { data: myRecord } = await supabase.from("users").select("tenant_id").eq("id", me.id).single();
    if (!myRecord) return apiError("User record not found", 403);

    const now = new Date().toISOString();

    const rows = players.map((p: Record<string, unknown>) => ({
      ...p,
      tenant_id: myRecord.tenant_id,
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
    return apiError(err);
  }
}
