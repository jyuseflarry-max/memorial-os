import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

/** GET /api/sessions/[date]/list?team_id=X — all sessions for a date+team */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    const teamId   = request.nextUrl.searchParams.get("team_id");
    const supabase = getSupabaseServer();

    let query = supabase
      .from("sessions")
      .select("id, label, start_time, drills")
      .eq("date", date)
      .order("label", { ascending: true });
    if (teamId) query = query.eq("team_id", teamId);

    const { data, error } = await query;
    if (error) throw error;

    const summaries = (data ?? []).map((row) => ({
      id:          row.id,
      label:       row.label,
      start_time:  row.start_time,
      drill_count: Array.isArray(row.drills) ? row.drills.length : 0,
    }));

    return Response.json(summaries);
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
