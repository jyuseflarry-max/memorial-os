import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-error";

/** GET /api/sessions/[date]/list?team_id=X — all sessions for a date+team */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    const teamId   = request.nextUrl.searchParams.get("team_id");
    const db       = await getDb();

    let query = db
      .from("sessions")
      .select("id, label, start_time, drills")
      .eq("date", date)
      .order("label", { ascending: true });
    if (teamId) query = query.eq("team_id", teamId);

    const { data, error } = await query;
    if (error) throw error;

    type SessionRow = { id: string; label: string | null; start_time: string | null; drills: unknown[] | null };
    const summaries = (data as SessionRow[] ?? []).map((row) => ({
      id:          row.id,
      label:       row.label,
      start_time:  row.start_time,
      drill_count: Array.isArray(row.drills) ? row.drills.length : 0,
    }));

    return Response.json(summaries);
  } catch (err: unknown) {
    return apiError(err);
  }
}
