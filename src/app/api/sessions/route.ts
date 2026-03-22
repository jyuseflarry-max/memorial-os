import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

/** GET /api/sessions?team_id=X — list all saved sessions for a team */
export async function GET(request: NextRequest) {
  try {
    const teamId  = request.nextUrl.searchParams.get("team_id");
    const supabase = getSupabaseServer();

    let query = supabase.from("sessions").select("id, date, start_time, drills, team_id").order("date", { ascending: true });
    if (teamId) query = query.eq("team_id", teamId);

    const { data, error } = await query;
    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

/** POST /api/sessions — upsert a session by (date, team_id) */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, start_time, drills, team_id } = body;

    if (!date) return Response.json({ error: "date is required" }, { status: 400 });

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("sessions")
      .upsert(
        { date, start_time, drills, team_id: team_id ?? null, updated_at: new Date().toISOString() },
        { onConflict: team_id ? "date,team_id" : "date" }
      )
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
