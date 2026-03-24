import { NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

/** GET /api/player-groupings?team_id=X */
export async function GET(request: NextRequest) {
  try {
    const teamId   = request.nextUrl.searchParams.get("team_id");
    const supabase = getSupabaseServer();
    let query = supabase
      .from("player_groupings")
      .select("*")
      .order("created_at", { ascending: false });
    if (teamId) query = query.eq("team_id", teamId);
    const { data, error } = await query;
    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}

/** POST /api/player-groupings — create a new grouping */
export async function POST(request: NextRequest) {
  try {
    const { name, team_id, groups } = await request.json();
    if (!name) return Response.json({ error: "name required" }, { status: 400 });

    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);

    const supabase = getSupabaseServer();
    const { data: myRecord } = await supabase.from("users").select("tenant_id").eq("id", me.id).single();
    if (!myRecord) return apiError("User record not found", 403);

    const { data, error } = await supabase
      .from("player_groupings")
      .insert({ name, team_id: team_id ?? null, groups: groups ?? [], tenant_id: myRecord.tenant_id })
      .select()
      .single();
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
