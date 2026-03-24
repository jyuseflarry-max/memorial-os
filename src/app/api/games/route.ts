import { NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

/** GET /api/games?team_id=xxx — list games ordered by date */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const teamId = searchParams.get("team_id");
    const season = searchParams.get("season");

    const supabase = getSupabaseServer();
    let query = supabase
      .from("games")
      .select("*")
      .order("game_date", { ascending: true })
      .order("game_time", { ascending: true, nullsFirst: true });

    if (teamId) query = query.eq("team_id", teamId);
    if (season)  query = query.eq("season", season);

    const { data, error } = await query;
    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return apiError(err);
  }
}

/** POST /api/games — create a new game */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);

    const supabase = getSupabaseServer();
    const { data: myRecord } = await supabase.from("users").select("tenant_id").eq("id", me.id).single();
    if (!myRecord) return apiError("User record not found", 403);

    const { data, error } = await supabase
      .from("games")
      .insert([{ ...body, tenant_id: myRecord.tenant_id, updated_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err: unknown) {
    return apiError(err);
  }
}
