import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

/** GET /api/sessions?team_id=X — list all saved sessions for a team */
export async function GET(request: NextRequest) {
  try {
    const teamId   = request.nextUrl.searchParams.get("team_id");
    const supabase = getSupabaseServer();

    let query = supabase
      .from("sessions")
      .select("id, date, start_time, drills, team_id, label")
      .order("date", { ascending: true });
    if (teamId) query = query.eq("team_id", teamId);

    const { data, error } = await query;
    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return apiError(err);
  }
}

/** POST /api/sessions — insert or update a session by (date, team_id, label).
 *
 * We use an explicit SELECT → UPDATE/INSERT rather than upsert because the DB
 * uses partial unique indexes (WHERE team_id IS NULL / IS NOT NULL).  Supabase's
 * onConflict only accepts column names — it cannot express the WHERE clause needed
 * to match a partial index, so Postgres rejects the ON CONFLICT specification.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, start_time, drills, team_id, label = "" } = body;

    if (!date) return Response.json({ error: "date is required" }, { status: 400 });

    const supabase  = getSupabaseServer();
    const tidOrNull = team_id ?? null;

    // Find existing row by natural key (team_id may be null)
    let findQuery = supabase
      .from("sessions")
      .select("id")
      .eq("date", date)
      .eq("label", label);
    findQuery = tidOrNull
      ? findQuery.eq("team_id", tidOrNull)
      : findQuery.is("team_id", null);

    const { data: existing } = await findQuery.maybeSingle();

    let result, err;
    if (existing?.id) {
      ({ data: result, error: err } = await supabase
        .from("sessions")
        .update({ start_time, drills, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single());
    } else {
      ({ data: result, error: err } = await supabase
        .from("sessions")
        .insert({ date, start_time, drills, team_id: tidOrNull, label, updated_at: new Date().toISOString() })
        .select()
        .single());
    }

    if (err) throw err;
    return Response.json(result, { status: 201 });
  } catch (err: unknown) {
    return apiError(err);
  }
}
