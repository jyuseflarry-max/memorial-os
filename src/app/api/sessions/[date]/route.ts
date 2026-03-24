import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

/** GET /api/sessions/[date]?team_id=X&label=Y — fetch one session by date + team + label */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    const teamId   = request.nextUrl.searchParams.get("team_id");
    const label    = request.nextUrl.searchParams.get("label") ?? "";
    const supabase = getSupabaseServer();

    let query = supabase.from("sessions").select("*").eq("date", date).eq("label", label);
    if (teamId) query = query.eq("team_id", teamId);
    const { data, error } = await query.single();

    if (error) {
      if ((error as { code?: string }).code === "PGRST116") return Response.json(null);
      throw error;
    }
    return Response.json(data);
  } catch (err: unknown) {
    return apiError(err);
  }
}

/** DELETE /api/sessions/[date]?team_id=X&label=Y */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    const teamId   = request.nextUrl.searchParams.get("team_id");
    const label    = request.nextUrl.searchParams.get("label") ?? "";
    const supabase = getSupabaseServer();

    let query = supabase.from("sessions").delete().eq("date", date).eq("label", label);
    if (teamId) query = query.eq("team_id", teamId);
    const { error } = await query;
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (err: unknown) {
    return apiError(err);
  }
}
