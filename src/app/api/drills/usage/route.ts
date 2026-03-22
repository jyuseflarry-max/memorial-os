import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/drills/usage?team_id=X
 * Returns { [drill_id]: { last_used: "YYYY-MM-DD", use_count: number } }
 */
export async function GET(request: NextRequest) {
  try {
    const teamId   = request.nextUrl.searchParams.get("team_id");
    const supabase = getSupabaseServer();

    let query = supabase
      .from("session_drills")
      .select("drill_id, date");

    if (teamId) query = query.eq("team_id", teamId);

    const { data, error } = await query;
    if (error) throw error;

    // Aggregate: last_used date and use_count per drill
    const result: Record<string, { last_used: string; use_count: number }> = {};
    for (const row of data ?? []) {
      const id = row.drill_id as string;
      if (!result[id]) {
        result[id] = { last_used: row.date as string, use_count: 1 };
      } else {
        result[id].use_count++;
        if (row.date > result[id].last_used) result[id].last_used = row.date as string;
      }
    }

    return Response.json(result);
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
