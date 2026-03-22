import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

/** GET /api/sessions/[date]?team_id=X — fetch one session by date + team */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    const teamId   = request.nextUrl.searchParams.get("team_id");
    const supabase = getSupabaseServer();

    let query = supabase.from("sessions").select("*").eq("date", date);
    if (teamId) query = query.eq("team_id", teamId);
    const { data, error } = await query.single();

    if (error) {
      if ((error as { code?: string }).code === "PGRST116") return Response.json(null);
      throw error;
    }
    return Response.json(data);
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

/** DELETE /api/sessions/[date]?team_id=X */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    const teamId   = request.nextUrl.searchParams.get("team_id");
    const supabase = getSupabaseServer();

    let query = supabase.from("sessions").delete().eq("date", date);
    if (teamId) query = query.eq("team_id", teamId);
    const { error } = await query;
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
