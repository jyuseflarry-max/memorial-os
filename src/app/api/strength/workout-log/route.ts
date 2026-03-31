import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-error";

// GET /api/strength/workout-log?program_id=X&week=1&day=1
// Returns all log entries for this player's session
export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const program_id = searchParams.get("program_id");
    const week       = searchParams.get("week");
    const day        = searchParams.get("day");
    if (!program_id || !week || !day) return apiError("program_id, week, day required", 400);

    const { data, error } = await db
      .from("strength_workout_logs")
      .select("id, exercise_id, set_number, reps_completed, weight_lbs, logged_at")
      .eq("player_id", db.userId)
      .eq("program_id", program_id)
      .eq("week", parseInt(week))
      .eq("day", parseInt(day));
    if (error) throw error;
    return Response.json(data ?? []);
  } catch (err) { return apiError(err); }
}

// POST /api/strength/workout-log
// Upserts a single set entry
export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json() as {
      program_id: string; week: number; day: number;
      exercise_id: string; set_number: number;
      reps_completed?: number; weight_lbs?: number;
    };

    // Use getSupabaseServer for upsert since db.insert doesn't expose onConflict
    const { getSupabaseServer } = await import("@/lib/supabase/server");
    const sb = getSupabaseServer();
    const { data, error } = await sb.from("strength_workout_logs").upsert(
      {
        tenant_id:      db.tenantId,
        player_id:      db.userId,
        program_id:     body.program_id,
        week:           body.week,
        day:            body.day,
        exercise_id:    body.exercise_id,
        set_number:     body.set_number,
        reps_completed: body.reps_completed ?? null,
        weight_lbs:     body.weight_lbs ?? null,
        logged_at:      new Date().toISOString(),
      },
      { onConflict: "tenant_id,player_id,program_id,week,day,exercise_id,set_number" }
    ).select().single();
    if (error) throw error;
    return Response.json(data);
  } catch (err) { return apiError(err); }
}
